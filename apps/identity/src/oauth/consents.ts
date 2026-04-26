import type { Client } from '~/oauth/clients'
import { base64url } from '@moauth/encoding'
import { ConsentRequest, db, eq } from 'astro:db'
import * as clients from '~/oauth/clients'
import * as hasher from '~/utils/hasher'

// type Result<T> = [true, T] | [false, undefined]

const MAX_CONSENT_REQUEST_DURATION_SECONDS = 60 * 15

export async function create(clientId: string, redirectUri: string, scope: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const requestId = base64url.encode(bytes)
  const requestIdHash = await hasher.hash(requestId)
  await db
    .insert(ConsentRequest)
    .values({
      idHash: requestIdHash,
      clientId,
      redirectUri,
      scope,
    })

  return {
    id: requestId,
  }
}

export async function get(requestId: string) {
  const requestIdHash = await hasher.hash(requestId)
  const [consentRequest] = await db
    .select()
    .from(ConsentRequest)
    .where(
      eq(ConsentRequest.idHash, requestIdHash),
    )

  if (!consentRequest) {
    return null
  }

  if (Date.now() - consentRequest.createdAt.getTime() >= 1000 * MAX_CONSENT_REQUEST_DURATION_SECONDS) {
    await db
      .delete(ConsentRequest)
      .where(
        eq(ConsentRequest.idHash, consentRequest.idHash),
      )
    return null
  }

  const client = await clients.get(consentRequest.clientId)
  if (!client) {
    // this can be prevented with foreign keys and inner join,
    //  but i store clients inside code now so...
    await db
      .delete(ConsentRequest)
      .where(
        eq(ConsentRequest.idHash, consentRequest.idHash),
      )
    return null
  }

  return {
    idHash: consentRequest.idHash,
    client,
    redirectUrl: new URL(consentRequest.redirectUri),
    scope: consentRequest.scope,
  }
}

export async function pull(requestId: string) {
  // `get` effectively removes consent request if it's invalid, so we safe to call it
  const consentRequest = await get(requestId)
  if (!consentRequest) {
    return null
  }

  await db
    .delete(ConsentRequest)
    .where(
      eq(ConsentRequest.idHash, consentRequest.idHash),
    )

  return consentRequest
}
