import { defineMiddleware } from 'astro:middleware'
import * as csrfTokens from './csrf-tokens'
import { csrfTokenSchema, tokenSchema } from './models'
import * as sessions from './sessions'

const CSRF_TOKEN = Symbol('CSRF_TOKEN')

export const validateSession = defineMiddleware(async (context, next) => {
  context.locals.session = null

  if (context.isPrerendered) {
    return next()
  }

  const token = context.cookies.get('sessionid')?.value
  if (!token) {
    return next()
  }

  const validation = tokenSchema.safeParse(token)
  if (!validation.success) {
    context.cookies.delete('sessionid')
    return next()
  }

  const session = await sessions.get(...validation.data)
  if (!session) {
    context.cookies.delete('sessionid')
    return next()
  }

  if (session.inactive) {
    const extended = await sessions.extend(session.id)
    context.cookies.set('sessionid', token, {
      path: '/',
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      httpOnly: true,
      maxAge: extended.expiresIn,
    })
  }

  // save raw csrf token and set masked one to embed into html
  ;(session as any)[CSRF_TOKEN] = session.csrfToken
  session.csrfToken = csrfTokens.mask(session.csrfToken)
  context.locals.session = session

  return next()
})

// https://github.com/withastro/astro/blob/main/packages/astro/src/core/app/middlewares.ts
export const validateCsrfToken = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next()
  }

  // no session, no csrf problems
  const session = context.locals.session
  if (!session) {
    return next()
  }
  // let's not modify state in GET and OPTIONS please
  //  PUT, DELETE and PATCH should trigger OPTIONS request first, which will passthrough,
  //  but after it browser will show error if proper CORS policy was set up,
  //  anyways let's include check for those as well (TRACE not supported by node.js)
  if (['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    return next()
  }

  async function readCsrfToken(): Promise<string | null> {
    const contentType = context.request.headers.get('content-type')
    const isFormLike = ['application/x-www-form-urlencoded', 'multipart/form-data'].some(
      formLike => contentType?.toLowerCase().includes(formLike),
    )
    const xCsrfToken = context.request.headers.get('x-csrf-token')
    if (!(contentType && isFormLike)) {
      return xCsrfToken
    }

    // TODO: request body size check, although Astro should handle a global limit
    const request = context.request.clone()
    const form = await request.formData()
    const values = form.getAll('csrf_token')
    if (values.length !== 1) {
      return null
    }
    const value = values[0]!
    if (value instanceof File) {
      return null
    }
    return value
  }

  const token = await readCsrfToken()
  const validation = csrfTokenSchema.safeParse(token)
  if (!validation.success) {
    // http 419 can also be used
    return new Response('CSRF validation failed', { status: 403 })
  }

  const masked = validation.data
  const raw: string = (session as any)[CSRF_TOKEN]
  const validCsrfToken = csrfTokens.verify(masked, raw)
  if (!validCsrfToken) {
    return new Response('CSRF validation failed', { status: 403 })
  }

  return next()
})
