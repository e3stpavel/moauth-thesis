import { sequence } from 'astro:middleware'
import { validateSession } from '~/auth/middleware'
import { formatServerErrors } from '~/oauth/middleware'

export const onRequest = sequence(validateSession, formatServerErrors)
