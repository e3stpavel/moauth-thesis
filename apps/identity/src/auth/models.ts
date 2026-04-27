import { base32 } from '@moauth/encoding'
import { z } from 'astro/zod'

export const tokenSchema = z.string()
  .transform(input => ([input.slice(0, 24), input.slice(24)]))
  .pipe(
    z.tuple([
      z.string().cuid2().length(24),
      z.string()
        .regex(base32.regex)
        .length(Math.ceil(32 * 8 / 5)),
    ]),
  )

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const registrationSchema = credentialsSchema.extend({
  name: z.string().min(3),
})

// to avoid attack surface, let's use whitelist of relative paths
export const redirectUriSchema = z.union([
  z.literal('/'),
  z.string().startsWith('/consent'),
])

export const csrfTokenSchema = z.string()
  .length(Math.ceil(4 * 40 / 3))
  .base64url()
