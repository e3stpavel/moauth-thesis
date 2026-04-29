import { base32, base64, formUrlEncoded, hex } from '@moauth/encoding'
import { z } from 'astro/zod'
import { splitN } from '~/utils/strings'

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

// we must send invalid_scope in case scope is unknown or invalid
export const scopeSchema = z.string()

export const stateSchema = z.string()

export const authorizeRequestSchema = z.object({
  'response_type': responseTypeSchema,
  'client_id': clientIdSchema,
  'redirect_uri': redirectUrlSchema.optional(),
  'scope': scopeSchema.optional(),
  'state': stateSchema, // we require state
})

export const consentRequestIdSchema = z.string()
  .length(Math.ceil(4 * 32 / 3))
  .base64url()

export const consentResponseSchema = z.object({
  'approved': z.coerce.boolean(),
  'request_id': consentRequestIdSchema,
})

export const clientSecretSchema = z.string()
  .length(32 * 2)
  .regex(hex.uppercase.regex)

export const clientSecretPostSchema = z.object({
  'client_id': clientIdSchema,
  'client_secret': clientSecretSchema,
})

export const clientSecretBasicSchema = z.string()
  .startsWith('Basic ')
  .transform(input => input.slice('Basic '.length))
  .pipe(
    z.string().base64(),
  )
  .transform(base64.decode)
  .transform(input => splitN(new TextDecoder().decode(input), ':', 2))
  .transform((input, context) => {
    return input.map((encoded) => {
      if (!formUrlEncoded.validate(encoded)) {
        context.addIssue({
          code: 'custom',
          message: 'client_id and client_secret must be encoded using application/x-www-form-urlencoded',
        })
        return ''
      }
      return formUrlEncoded.decode(encoded)
    })
  })
  .pipe(
    z.tuple([
      clientIdSchema,
      clientSecretSchema,
    ]),
  )

export const grantTypeSchema = z.string()

export const authorizationCodeGrantSchema = z.object({
  'code': z.string()
    .length(Math.ceil(32 * 8 / 5))
    .regex(base32.regex),
  'redirect_uri': redirectUrlSchema.optional(),
})

export const refreshTokenGrantSchema = z.object({
  'refresh_token': z.string(),
  'scope': scopeSchema.optional(),
})

export const clientCredentialsGrantSchema = z.object({
  'scope': scopeSchema.optional(),
})
