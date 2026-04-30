import { base64url } from '@moauth/encoding'
import { ConsentRequest, db, eq } from 'astro:db'
import * as clients from '~/oauth/clients'
import * as hasher from '~/utils/hasher'
import * as redirectUris from './redirect-uris'

const MAX_CONSENT_REQUEST_DURATION_SECONDS = 60 * 15

type NewConsentRequest = Omit<typeof ConsentRequest.$inferInsert, 'id' | 'createdAt'>

export async function create(consentRequest: NewConsentRequest) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = base64url.encode(bytes)
  const requestId = await hasher.hash(token)
  await db
    .insert(ConsentRequest)
    .values({
      ...consentRequest,
      id: requestId,
    })

  return { token }
}

export async function get(token: string) {
  const requestId = await hasher.hash(token)
  const [consentRequest] = await db
    .select()
    .from(ConsentRequest)
    .where(
      eq(ConsentRequest.id, requestId),
    )

  if (!consentRequest) {
    return null
  }

  if (Date.now() - consentRequest.createdAt.getTime() >= 1000 * MAX_CONSENT_REQUEST_DURATION_SECONDS) {
    await db
      .delete(ConsentRequest)
      .where(
        eq(ConsentRequest.id, consentRequest.id),
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
        eq(ConsentRequest.id, consentRequest.id),
      )
    return null
  }

  const redirectUrl = redirectUris.validate(client, consentRequest.redirectUri)
  if (!redirectUrl) {
    // this can happen when client changed his registered redirect_uri in the middle of the request
    //  therefore we invalidate the request immediately as this can signal that client is under attack
    await db
      .delete(ConsentRequest)
      .where(
        eq(ConsentRequest.id, consentRequest.id),
      )
    return null
  }

  return {
    ...consentRequest,
    client,
    redirectUrl,
  }
}

export async function pull(token: string) {
  // `get` effectively removes consent request if it's invalid, so we safe to call it
  const consentRequest = await get(token)
  if (!consentRequest) {
    return null
  }

  await db
    .delete(ConsentRequest)
    .where(
      eq(ConsentRequest.id, consentRequest.id),
    )

  return consentRequest
}
