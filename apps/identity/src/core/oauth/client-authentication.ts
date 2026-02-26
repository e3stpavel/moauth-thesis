import type { Context } from '~/core/oauth/context'
import { decodeBase64, validateBase64 } from '@minoauth/encoding'
import { z } from 'astro/zod'
import { Clients, db, eq } from 'astro:db'
import { InvalidClientError, InvalidRequestError } from '~/core/oauth/error'
import { Client } from './client'

const clientCredentialsSchema = z.object({
  clientId: z.string().cuid2(), // TODO: length
  clientSecret: z.string()
    .regex(/^[0-9a-f]+$/)
    .optional(),
})

type ClientCredentials = z.infer<typeof clientCredentialsSchema>

function validateClientCredentials(context: Context): ClientCredentials {
  const isBodyCredentials = context.body.has('client_id') || context.body.has('client_secret')
  const isBasicCredentials = context.headers.has('Authorization')

  if (isBodyCredentials && isBasicCredentials) {
    throw new InvalidRequestError(
      'The client must not use more than one authentication method in each request',
      'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
    )
  }

  if (!isBodyCredentials && !isBasicCredentials) {
    throw new InvalidClientError(
      'Confidential clients or other clients issued client credentials must authenticate',
      'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
    )
  }

  if (isBodyCredentials) {
    const validation = clientCredentialsSchema
      .safeParse({
        clientId: context.body.get('client_id'),
        clientSecret: context.body.get('client_secret'),
      })

    if (!validation.success) {
      throw new InvalidClientError()
    }

    return validation.data
  }

  // we checked if both exist, if none exist, if body credentials exist
  const [authType, credentials] = context.headers.get('Authorization')!.split(' ')
  if (!(authType && credentials)) {
    throw new InvalidClientError()
  }

  if (authType !== 'Basic') {
    throw new InvalidClientError()
  }

  const isValidCredentials = validateBase64(credentials)
  if (!isValidCredentials) {
    throw new InvalidClientError()
  }

  const [clientId, clientSecret] = new TextDecoder().decode(decodeBase64(credentials)).split(':')
  const validation = clientCredentialsSchema
    .required({ clientSecret: true })
    .safeParse({ clientId, clientSecret })

  if (!validation.success) {
    throw new InvalidClientError()
  }

  return validation.data
}

// TODO: how other auth methods will be handled, must be invalid_client
export async function authenticateClient(context: Context): Promise<Client> {
  const credentials = validateClientCredentials(context)

  const [data] = await db.select().from(Clients).where(eq(Clients.id, credentials.clientId))
  if (!data) {
    throw new InvalidClientError()
  }

  // TODO: mapping must be done somewhere else, i.e. @minoauth/db
  const client = new Client(data.id, data.redirectUris as string[], data.secretHash)

  if (client.isPublic) {
    // public clients cannot hold client_secret, request is malformed
    if (credentials.clientSecret) {
      throw new InvalidClientError()
    }

    return client
  }

  if (!credentials.clientSecret) {
    throw new InvalidClientError()
  }

  const isSecretValid = client.verifySecret(credentials.clientSecret, () => true)
  if (!isSecretValid) {
    throw new InvalidClientError()
  }

  return client
}
