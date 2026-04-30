import type { Grant } from './grant-types'
import type { ScopeSet } from './scopes'
import * as jwt from '~/utils/jwt'
import * as refreshTokens from './refresh-tokens'

// Parameter names and string values are included as JSON strings.
//  Numerical values are included as JSON numbers.  The order of
//  parameters does not matter and can vary.
type TokenResponse = Partial<Record<string, string | number>>

/** `scope` represents the scope requested by client and granted (validated) by us, `grant.scope` is different */
type TokenIssuerHandler = (grant: Grant, scope: ScopeSet) => Promise<TokenResponse> | TokenResponse

interface TokenIssuer {
  handle: TokenIssuerHandler
}

function defineTokenIssuer(handle: TokenIssuerHandler): TokenIssuer {
  return { handle }
}

const issueAccessToken = defineTokenIssuer(async (grant, scope) => {
  const expiresIn = 60 * 3 // maybe it can be longer for client_credentials?
  const token = await jwt.encode({
    typ: 'at+JWT',
    key: 'sig.oauth.access_token',
    expiresIn,
    claims: {
      'sub': grant.userId,
      'aud': 'http://localhost:4321', // static for now, resource parameter implementation is needed
      'client_id': grant.clientId,
      'scope': scope.encode(),
      // auth_time, acr, amr out of scope now, but we should simply link session
    },
  })

  return {
    'access_token': token,
    'token_type': 'bearer', // value is case insensitive
    'expires_in': expiresIn,
    'scope': scope.encode(),
  }
})

const issueRefreshToken = defineTokenIssuer(async (grant, scope) => {
  // we won't check for grant_type here, just because
  // scope validation should handle invalid scope for grant_type
  if (!scope.has('offline_access')) {
    return {}
  }

  let token
  if (grant.type === 'refresh_token') {
    token = await refreshTokens.rotate(grant.id)
  }
  else {
    token = await refreshTokens.create({
      clientId: grant.clientId,
      userId: grant.userId,
      scope: scope.encode(),
    })
  }

  return {
    'refresh_token': [token.id, token.secret, token.signature].join('.'),
  }
})

// issueIdToken in the future

export async function issue(grant: Grant, scope: ScopeSet): Promise<TokenResponse> {
  const responses = await Promise.all(
    [issueAccessToken, issueRefreshToken].map(issuer => issuer.handle(grant, scope)),
  )
  const response = Object.assign({}, ...responses)
  return response
}
