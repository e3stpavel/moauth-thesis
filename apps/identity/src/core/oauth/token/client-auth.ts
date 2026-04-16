import type { Context } from '~/core/oauth/token/request'
import { Clients, db, eq } from 'astro:db'
import { logger } from 'moauth:logger'
import { Client } from '~/core/oauth/client'
import { InvalidClientError, InvalidRequestError } from '~/core/oauth/token/error'
import * as hash from '~/utils/hash'

interface ClientSecretRequest {
  method: 'client_secret_basic' | 'client_secret_post'
  clientId: string
  clientSecret: string
}

export async function handleClientSecretRequest(request: ClientSecretRequest) {
  const [result] = await db.select().from(Clients).where(eq(Clients.id, request.clientId))
  if (!result) {
    logger.error(`Client lookup failed (${request.clientId})`)
    throw new InvalidClientError()
  }

  const client = Client.parserFromDB(result)
  if (!client.isConfidential) {
    logger.error(`Public client (${client.id}) included 'client_secret' in request`)
    throw new InvalidClientError()
  }

  // TODO: check token_endpoint_auth_method when added
  const isSecretValid = await client.verifySecret(request.clientSecret, hash.verify)
  if (!isSecretValid) {
    logger.error(`'client_secret' mismatch for client (${client.id})`)
    throw new InvalidClientError()
  }

  return client
}

interface NoneRequest {
  method: 'none'
  clientId: string
}

export async function handleNoneRequest(request: NoneRequest) {
  const [result] = await db.select().from(Clients).where(eq(Clients.id, request.clientId))
  if (!result) {
    logger.error(`Client lookup failed (${request.clientId})`)
    throw new InvalidClientError()
  }

  const client = Client.parserFromDB(result)
  if (!client.isPublic) {
    logger.error(`Confidential client (${client.id}) tried to authenticate using 'none' method`)
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
      logger.error(`Authenticated client 'client_id' (${context.auth.clientId}) doesn't match 'client_id' in request body (${context.body.get('client_id')})`)
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
      logger.error('\'client_id\' is missing from request body, although \'client_secret\' provided')
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
    logger.debug('No client authentication method found, using \'none\' as a fallback')
    clientAuthRequests.push({
      method: 'none',
      clientId: context.body.get('client_id')!,
    })
  }

  if (clientAuthRequests.length === 0) {
    logger.error('Client authentication is missing from request')
    throw new InvalidClientError(
      'Confidential clients or other clients issued client credentials must authenticate',
      'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
    )
  }

  if (clientAuthRequests.length > 1) {
    logger.error(`More than one client authentication method is included in request (${clientAuthRequests.map(request => request.method).join(', ')})`)
    throw new InvalidRequestError(
      'The client must not use more than one authentication method in each request',
      'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
    )
  }

  logger.info(`'${clientAuthRequests.at(0)?.method}' method was selected for authenticating the client`)
  return clientAuthRequests.at(0)!
}
