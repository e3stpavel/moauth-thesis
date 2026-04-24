import { validateSession } from '~/auth/middleware'

export const onRequest = validateSession
