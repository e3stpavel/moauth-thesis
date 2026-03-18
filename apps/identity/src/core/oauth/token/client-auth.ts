import type { Context } from '~/core/oauth/token/request'
import { Clients, db, eq } from 'astro:db'
import { InvalidClientError, InvalidRequestError } from '~/core/oauth/token/error'

interface ClientSecretRequest {
  method: 'client_secret_basic' | 'client_secret_post'
  clientId: string
  clientSecret: string
}

export async function handleClientSecretRequest(request: ClientSecretRequest) {
  const [client] = await db.select().from(Clients).where(eq(Clients.id, request.clientId))
  if (!client) {
    throw new InvalidClientError()
  }

  if (!(client.isPublic && client.secretHash)) {
    throw new InvalidClientError()
  }

  // TODO: check token_endpoint_auth_method when added
  // TODO: verify secret hash
  console.log('verifying secret...')

  return client
}

interface NoneRequest {
  method: 'none'
  clientId: string
}

export async function handleNoneRequest(request: NoneRequest) {
  const [client] = await db.select().from(Clients).where(eq(Clients.id, request.clientId))
  if (!client) {
    throw new InvalidClientError()
  }

  if (!client.isPublic) {
    throw new InvalidClientError()
  }

  return client
}

type ClientAuthRequest = ClientSecretRequest | NoneRequest

export function validateRequest(context: Context): ClientAuthRequest {
  const clientAuthRequests: ClientAuthRequest[] = []

  if (context.auth) {
    // we will not forbid the usage of 'client_id' in body alongside with 'Authorization' header,
    //  but we must check whether they are identical or not
    if (context.body.has('client_id') && context.body.get('client_id') !== context.auth.clientId) {
      throw new InvalidClientError()
    }

    clientAuthRequests.push({
      method: 'client_secret_basic',
      clientId: context.auth.clientId,
      clientSecret: context.auth.clientSecret,
    })
  }

  if (context.body.has('client_secret')) {
    if (!context.body.has('client_id')) {
      throw new InvalidClientError()
    }

    clientAuthRequests.push({
      method: 'client_secret_post',
      clientId: context.body.get('client_id')!,
      clientSecret: context.body.get('client_secret')!,
    })
  }

  // method 'none' is used as a fallback when no proper auth method is used
  if (context.body.has('client_id') && clientAuthRequests.length === 0) {
    clientAuthRequests.push({
      method: 'none',
      clientId: context.body.get('client_id')!,
    })
  }

  if (clientAuthRequests.length === 0) {
    throw new InvalidClientError(
      'Confidential clients or other clients issued client credentials must authenticate',
      'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
    )
  }

  if (clientAuthRequests.length > 1) {
    throw new InvalidRequestError(
      'The client must not use more than one authentication method in each request',
      'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
    )
  }

  return clientAuthRequests.at(0)!
}
