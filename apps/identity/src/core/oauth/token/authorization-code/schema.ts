import { z } from 'astro/zod'

export const authorizationCodeRequestSchema = z.object({
  code: z.string().base64url(), // TODO: length
  redirectUri: z.string()
    .url()
    .superRefine((input, context) => {
      const url = new URL(input)
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
    }),
})
