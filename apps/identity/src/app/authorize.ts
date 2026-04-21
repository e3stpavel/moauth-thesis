import { base32, hex } from '@moauth/encoding'
import { ConsentRequests, db } from 'astro:db'

export async function handle(form: URLSearchParams) {
  const shouldTriggerError = form.get('fatal-error')
  if (shouldTriggerError) {
    throw new Error('Invalid request')
  }

  const shouldTriggerRedirectError = form.get('redirect-error')
  if (shouldTriggerRedirectError) {
    const url = new URL('http://localhost:3211/cb')
    url.searchParams.set('error', 'invalid_request')
    url.searchParams.set('error_description', 'Invalid request')
    url.searchParams.set('state', 'test1234')
    url.searchParams.sort()

    return { success: false as const, data: url }
  }

  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const requestId = base32.encode(bytes)

  const hashBytes = await crypto.subtle.digest('SHA-256', bytes)
  const requestIdHash = hex.lowercase.encode(new Uint8Array(hashBytes))

  await db.insert(ConsentRequests).values({
    id: requestIdHash,
    clientId: 'test',
    redirectUri: 'http://localhost:4321/auth/callback',
    state: '1234test',
  })

  // replace with builtin sessions
  return {
    success: true as const,
    data: {
      requestId,
      expiresIn: 60 * 15,
    },
  }
}

export default {
  handle,
}
