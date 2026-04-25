import { z } from 'astro/zod'

// if value of response_type parameter is anything besides code or token,
//  the server can return an invalid_request error
//  https://www.oauth.com/oauth2-servers/authorization/the-authorization-request#other-errors
export const responseTypeSchema = z.string()
  .transform(input => input.split(' ').filter(Boolean))
  .pipe(
    z.enum(['code', 'token']).array(),
  )
  .transform(input =>
    new Set(input).values().toArray(),
  )

export const clientIdSchema = z.string()
  .cuid2()
  .length(24)

export const redirectUrlSchema = z.string().url().superRefine((value, context) => {
  const url = new URL(value)
  if (['javascript:', 'data:', 'vbscript:'].includes(url.protocol)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Protocol is not allowed',
      path: ['protocol'],
    })
  }

  if (url.protocol === 'http:') {
    if (url.hostname !== 'localhost') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Protocol is not allowed',
        path: ['protocol'],
      })
    }
  }

  if (url.hash !== '') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL must not contain fragment',
      path: ['hash'],
    })
  }
})

export const scopeSchema = z.string()
  .transform(input => input.split(' ').filter(Boolean))
  .pipe(z.string().array())
  .transform(input =>
    new Set(input).values().toArray(),
  )

export const stateSchema = z.string()

export const authorizeRequestSchema = z.object({
  'response_type': responseTypeSchema,
  'client_id': clientIdSchema,
  'redirect_uri': redirectUrlSchema.optional(),
  'scope': scopeSchema.optional(),
  'state': stateSchema, // we require state
})
