import type { Context } from '~/core/oauth/context'
import { decodeBase64, validateBase64 } from '@minoauth/encoding'
import { z } from 'astro/zod'
import { Clients, db, eq } from 'astro:db'
import { InvalidClientError, InvalidRequestError } from '~/core/oauth/error'
import { Client } from './client'

const clientCredentialsSchema = z.object({
  clientId: z.string().cuid2(), // TODO: length
  clientSecret: z.string().regex(/^[0-9a-f]+$/).optional(),
})

type ClientCredentials = z.infer<typeof clientCredentialsSchema>

function tryValidateClientCredentials(context: Context): [true, ClientCredentials] | [false] {
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
        // zod optional doesn't accept null values
        clientSecret: context.body.get('client_secret') ?? undefined,
      })

    if (!validation.success) {
      return [false]
    }

    return [true, validation.data]
  }

  // we checked if both exist, if none exist, if body credentials exist
  const [authType, credentials] = context.headers.get('Authorization')!.split(' ')
  if (!(authType && credentials)) {
    return [false]
  }

  if (authType !== 'Basic') {
    return [false]
  }

  const isValidCredentials = validateBase64(credentials)
  if (!isValidCredentials) {
    return [false]
  }

  const [clientId, clientSecret] = new TextDecoder().decode(decodeBase64(credentials)).split(':')
  const validation = clientCredentialsSchema
    .required({ clientSecret: true })
    .safeParse({ clientId, clientSecret })

  if (!validation.success) {
    return [false]
  }

  return [true, validation.data]
}

// TODO: how other auth methods will be handled, must be invalid_client
async function tryAuthenticateClient(context: Context): Promise<[true, Client] | [false]> {
  const [isValidCredentials, credentials] = tryValidateClientCredentials(context)
  if (!isValidCredentials) {
    return [false]
  }

  const [data] = await db.select().from(Clients).where(eq(Clients.id, credentials.clientId))
  if (!data) {
    return [false]
  }

  // TODO: mapping must be done somewhere else, i.e. @minoauth/db
  const client = new Client(data.id, data.redirectUris as string[], data.secretHash)

  // TODO: should we ignore the fact that secret can be included with public client
  //  The authorization server MUST ignore unrecognized request parameters. (section 3.2)
  if (client.isPublic) {
    return [true, client]
  }

  if (!credentials.clientSecret) {
    return [false]
  }

  const isSecretValid = client.verifySecret(credentials.clientSecret, () => true)
  if (!isSecretValid) {
    return [false]
  }

  return [true, client]
}

export async function authenticateClient(context: Context) {
  const [isAuthenticated, client] = await tryAuthenticateClient(context)
  if (!isAuthenticated) {
    throw new InvalidClientError('Invalid client credentials')
  }

  return client
}
