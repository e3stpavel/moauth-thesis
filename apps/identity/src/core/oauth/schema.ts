import { hexLowercase } from '@minoauth/encoding'
import { z } from 'astro/zod'

export const clientIdSchema = z.string().cuid2('Invalid')

export const clientSecretSchema = z.string().regex(hexLowercase.regex)

export const redirectUriSchema = z.string()
  .url()
  .superRefine((value, context) => {
    const url = new URL(value)
    if (['javascript:', 'data:', 'vbscript:'].includes(url.protocol)) {
      context.addIssue({
        code: 'custom',
        message: 'Protocol is not allowed',
        path: ['protocol'],
      })
    }

    if (url.protocol === 'http:') {
      if (url.hostname !== 'localhost') {
        context.addIssue({
          code: 'custom',
          message: 'Protocol is not allowed',
          path: ['protocol'],
        })
      }
    }

    if (url.hash !== '') {
      context.addIssue({
        code: 'custom',
        message: 'URL must not contain fragment',
        path: ['hash'],
      })
    }
  })
