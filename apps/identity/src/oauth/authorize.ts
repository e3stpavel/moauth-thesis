import type { APIContext } from 'astro'
import type { Client } from './clients'

// type Result<T> = [true, T] | [false, undefined]

export function validateRedirectUri(client: Client, redirectUri: string | undefined): URL | null {
  if (!redirectUri) {
    if (client.redirectUris.length === 1) {
      return new URL(client.redirectUris[0]!)
    }
    return null
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return null
  }
  return new URL(redirectUri)
}

type ProtocolError = Partial<Record<'error' | 'error_description' | 'error_uri' | (string & {}), string>>

export function redirectWithError(context: APIContext, redirectUrl: URL, error: ProtocolError): Response {
  Object.entries(error)
    .forEach(([key, value]) => {
      if (value) {
        redirectUrl.searchParams.set(key, value)
      }
    })

  redirectUrl.searchParams.sort()
  const status = context.request.method === 'GET' ? 302 : 303
  return context.redirect(redirectUrl.href, status)
}
