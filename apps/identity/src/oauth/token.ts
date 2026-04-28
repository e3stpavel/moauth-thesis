import type { Client } from './clients'
import * as authorizationCodes from './authorization-codes'
import * as clients from './clients'
import { authorizationCodeGrantSchema, clientCredentialsGrantSchema, clientSecretBasicSchema, clientSecretPostSchema, grantTypeSchema } from './models'
import { validateRequestParameter, validateRequestParameters } from './parameters'

interface ClientAuthHandler { handle: () => Promise<Client | null> }

type Result<T> = [true, T, undefined] | [false, undefined, string]

export function validateClientAuth(form: URLSearchParams, headers: Headers): Result<ClientAuthHandler[]> {
  const handlers = []

  // client_secret_basic, overall we support only `Basic` scheme only
  if (headers.has('authorization')) {
    const validation = clientSecretBasicSchema.safeParse(headers.get('authorization'))
    if (!validation.success) {
      return [false, undefined, 'Invalid authorization']
    }
    handlers.push(
      { handle: () => clients.authenticate(...validation.data) },
    )
  }

  // client_secret_post
  if (form.has('client_secret')) {
    const [valid, parameters, error] = validateRequestParameters(form, clientSecretPostSchema)
    if (!valid) {
      return [false, undefined, error]
    }
    handlers.push(
      { handle: () => clients.authenticate(parameters['client_id'], parameters['client_secret']) },
    )
  }

  // add another methods later, like private_key_jwt

  return [true, handlers, undefined]
}

export function respondWithInvalidClient(message: string, headers: Headers): Response {
  headers.set('www-authenticate', 'Basic realm="oauth"')
  return Response.json(
    {
      'error': 'invalid_client',
      'error_description': message,
    },
    { status: 401, headers },
  )
}

interface Grant {
  clientId: string
  userId: string
  scope: string
}

interface GrantHandler {
  grantType: string
  handle: (client: Client) => Promise<Grant | null> | Grant | null
}

export function validateGrantType(form: URLSearchParams): Result<GrantHandler | null> {
  const [validGrantType, grantType, grantTypeError] = validateRequestParameter('grant_type', form, grantTypeSchema)
  if (!validGrantType) {
    return [false, undefined, grantTypeError]
  }

  switch (grantType) {
    case 'authorization_code': {
      const [validParameters, parameters, parametersError] = validateRequestParameters(form, authorizationCodeGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }

      return [
        true,
        {
          grantType: 'authorization_code',
          handle: client => authorizationCodes.use(parameters.code, client, parameters['redirect_uri']),
        },
        undefined,
      ]
    }
    case 'client_credentials': {
      const [validParameters, parameters, parametersError] = validateRequestParameters(form, clientCredentialsGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }

      // TODO: scope
      return [
        true,
        {
          grantType: 'client_credentials',
          handle: client => ({ clientId: client.id, userId: client.id, scope: '' }),
        },
        undefined,
      ]
    }
    case 'refresh_token':
    default:
      return [true, null, undefined]
  }
}
