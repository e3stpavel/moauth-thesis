import type { Client } from '~/oauth/clients'
import { base32 } from '@moauth/encoding'
import { AuthorizationCode, db, eq } from 'astro:db'
import * as hasher from '~/utils/hasher'
import { validateRedirectUri } from './authorize'

type Nullish<T> = T | null | undefined

const MAX_AUTHORIZATION_CODE_DURATION_SECONDS = 60

export async function create(userId: string, clientId: string, redirectUri: Nullish<string>, scope: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = base32.encode(bytes)
  const id = await hasher.hash(token)
  await db
    .insert(AuthorizationCode)
    .values({
      id,
      clientId,
      userId,
      redirectUri,
      scope,
    })

  return { token }
}

export async function use(token: string, client: Client, redirectUri: string | undefined) {
  const id = await hasher.hash(token)
  const [authorizationCode] = await db
    .delete(AuthorizationCode)
    .where(
      eq(AuthorizationCode.id, id),
    )
    .returning()

  // TODO: detect code reuse and invalidate all access/refresh tokens
  //  looking for tokens when anyone tries crap with "valid" looking codes is not good, sign code with HMAC?
  if (!authorizationCode) {
    return null
  }

  if (Date.now() - authorizationCode.createdAt.getTime() >= 1000 * MAX_AUTHORIZATION_CODE_DURATION_SECONDS) {
    return null
  }

  if (authorizationCode.clientId !== client.id) {
    return null
  }

  // if redirect_uri was present in authorization request, redirect_uri provided now must match
  if (authorizationCode.redirectUri && authorizationCode.redirectUri !== redirectUri) {
    return null
  }
  // if redirect_uri provided now, check whether it is valid for client anyways
  if (redirectUri && !validateRedirectUri(client, redirectUri)) {
    return null
  }

  return {
    id: authorizationCode.id,
    userId: authorizationCode.userId,
    scope: authorizationCode.scope,
  }
}
