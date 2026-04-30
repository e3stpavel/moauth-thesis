import type { Client } from './clients'
import { base64url } from '@moauth/encoding'
import * as parametersValidator from '~/utils/parameters-validator'
import * as authorizationCodes from './authorization-codes'
import {
  authorizationCodeGrantSchema,
  clientCredentialsGrantSchema,
  grantTypeSchema,
  refreshTokenGrantSchema,
} from './models'
import * as redirectUris from './redirect-uris'
import * as refreshTokens from './refresh-tokens'

type Result<T> = [true, T, undefined] | [false, undefined, string]

// maybe we can make this a discriminated union, if we need to get extra props
export interface Grant {
  type: string
  id: string
  userId: string
  clientId: string
  scope: string
}

interface GrantHandler {
  grantType: string
  requestScope: string | undefined
  handle: (client: Client) => Promise<Grant | null> | Grant | null
}

export function validate(form: URLSearchParams): Result<GrantHandler | null> {
  const [validGrantType, grantType, grantTypeError] = parametersValidator.validateOne('grant_type', form, grantTypeSchema)
  if (!validGrantType) {
    return [false, undefined, grantTypeError]
  }

  switch (grantType) {
    case 'authorization_code': {
      const [validParameters, parameters, parametersError] = parametersValidator.validate(form, authorizationCodeGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }
      return [
        true,
        {
          grantType,
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
            if (parameters['redirect_uri'] && !redirectUris.validate(client, parameters['redirect_uri'])) {
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

            return { type: grantType, ...code }
          },
        },
        undefined,
      ]
    }
    case 'refresh_token': {
      const [validParameters, parameters, parametersError] = parametersValidator.validate(form, refreshTokenGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }
      return [
        true,
        {
          grantType,
          // eslint-disable-next-line dot-notation
          requestScope: parameters['scope'],
          handle: async (client) => {
            const refreshToken = await refreshTokens.get(...parameters['refresh_token'])
            if (!refreshToken) {
              return null
            }

            if (refreshToken.clientId !== client.id) {
              return null
            }

            return { type: grantType, ...refreshToken }
          },
        },
        undefined,
      ]
    }
    case 'client_credentials': {
      const [validParameters, parameters, parametersError] = parametersValidator.validate(form, clientCredentialsGrantSchema)
      if (!validParameters) {
        return [false, undefined, parametersError]
      }
      return [
        true,
        {
          grantType,
          // eslint-disable-next-line dot-notation
          requestScope: parameters['scope'] ?? 'read',
          // client_credentials doesn't support offline_access, because you're supposed to get access_token only
          // client_credentials resource owner is authenticated client
          handle: client => ({
            type: grantType,
            id: client.id,
            userId: client.id,
            clientId: client.id,
            scope: 'read write delete',
          }),
        },
        undefined,
      ]
    }
    default: {
      return [true, null, undefined]
    }
  }
}
