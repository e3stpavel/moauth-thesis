import type { Client } from './clients'
import { base64url } from '@moauth/encoding'
import * as authorizationCodes from './authorization-codes'
import { validateRedirectUri } from './authorize'
import * as clients from './clients'
import {
  authorizationCodeGrantSchema,
  clientCredentialsGrantSchema,
  clientSecretBasicSchema,
  clientSecretPostSchema,
  grantTypeSchema,
  refreshTokenGrantSchema,
} from './models'
import { validateRequestParameter, validateRequestParameters } from './parameters'
import * as refreshTokens from './refresh-tokens'

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
  id: string
  userId: string
  scope: string
}

interface GrantHandler {
  grantType: string
  requestScope: string | undefined
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
          // `scope` in this request is always empty because it was requested in /authorize
          requestScope: undefined,
          handle: async (client) => {
            // eslint-disable-next-line dot-notation
            const code = await authorizationCodes.use(parameters['code'])
            if (!code) {
              return null
            }

            if (code.clientId !== client.id) {
              return null
            }

            // if redirect_uri was present in authorization request, redirect_uri provided now must match
            if (code.redirectUri && code.redirectUri !== parameters['redirect_uri']) {
              return null
            }
            // if redirect_uri provided now, check whether it is valid for client anyways
            if (parameters['redirect_uri'] && !validateRedirectUri(client, parameters['redirect_uri'])) {
              return null
            }

            let codeChallenge = parameters['code_verifier']
            if (code.codeChallengeMethod === 'S256') {
              const encoder = new TextEncoder()
              const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(parameters['code_verifier']))
              codeChallenge = base64url.encode(new Uint8Array(buffer))
            }
            if (code.codeChallenge !== codeChallenge) {
              return null
            }

            return code
          },
        },
        undefined,
      ]
    }
    case 'refresh_token': {
      const [validParameters, parameters, parametersError] = validateRequestParameters(form, refreshTokenGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }
      return [
        true,
        {
          grantType: 'refresh_token',
          // eslint-disable-next-line dot-notation
          requestScope: parameters['scope'],
          handle: client => refreshTokens.get(...parameters['refresh_token'], client.id),
        },
        undefined,
      ]
    }
    case 'client_credentials': {
      const [validParameters, parameters, parametersError] = validateRequestParameters(form, clientCredentialsGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }
      return [
        true,
        {
          grantType: 'client_credentials',
          // eslint-disable-next-line dot-notation
          requestScope: parameters['scope'] ?? 'read',
          // client_credentials doesn't support offline_access, because you're supposed to get access_token only
          // client_credentials resource_owner is authenticated client
          handle: client => ({
            id: client.id,
            userId: client.id,
            scope: 'read write delete',
          }),
        },
        undefined,
      ]
    }
    default:
      return [true, null, undefined]
  }
}
