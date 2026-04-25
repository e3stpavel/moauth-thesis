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

// export function validateScope(client: Client, scopes: string[] | undefined): string[] {
//   // right now we ignore that, but in future we need to check scopes against client
//   //  basically whether client registered is allowed to access certain scopes (read write edit delete)
//   //  The authorization server MAY fully or partially ignore the scope requested by the client
//   if (!scopes) {
//     return []
//   }

//   if scopes.includes()
// }

type ProtocolErrorParameters = 'error' | 'error_description' | 'error_uri' | 'state'

type ProtocolError = Partial<Record<ProtocolErrorParameters | (string & {}), string>>

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
