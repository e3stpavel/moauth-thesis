import type { Client } from './clients'

type Nullish<T> = T | null | undefined

export function validate(client: Client, redirectUri: Nullish<string>): URL | null {
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
