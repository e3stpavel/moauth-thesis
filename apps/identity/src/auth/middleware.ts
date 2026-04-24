import { defineMiddleware } from 'astro:middleware'
import { tokenSchema } from './models'
import sessions from './sessions'

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

  context.locals.session = session

  return next()
})
