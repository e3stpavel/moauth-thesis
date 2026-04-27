import { sequence } from 'astro:middleware'
import { validateCsrfToken, validateSession } from '~/auth/middleware'
import { formatServerErrors } from '~/oauth/middleware'

export const onRequest = sequence(validateSession, validateCsrfToken, formatServerErrors)
