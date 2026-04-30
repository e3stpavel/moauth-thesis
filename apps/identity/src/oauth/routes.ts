import type { APIRoute } from 'astro'
import { readBodyWithLimit } from '~/utils/body'
import * as jwt from '~/utils/jwt'
import * as clients from './clients'
import * as consents from './consents'
import { authorizeRequestSchema, clientIdSchema, stateSchema } from './models'
import { validateRequestParameter, validateRequestParameters } from './parameters'
import * as redirectUris from './redirect-uris'
import * as refreshTokens from './refresh-tokens'
import * as scopes from './scopes'
import { respondWithInvalidClient, validateClientAuth, validateGrantType } from './token'

export const authorize: APIRoute = async (context) => {
  const headers = new Headers()
  headers.set('cache-control', 'no-store')
  headers.set('pragma', 'no-cache') // will be deprecated in 2.1

  let form
  switch (context.request.method) {
    case 'GET': {
      form = context.url.searchParams
      break
    }
    case 'POST': {
      if (context.request.headers.get('content-type') !== 'application/x-www-form-urlencoded') {
        return Response.json(
          {
            'error': 'invalid_request',
            'error_description': 'Invalid Content-Type, application/x-www-form-urlencoded expected',
          },
          { status: 400, headers },
        )
      }

      const [success, body] = await readBodyWithLimit(context.request.clone(), 5 * 1024)
      if (!success) {
        // 413
        //  https://datatracker.ietf.org/doc/html/rfc9126#section-2.3
        return Response.json(
          { 'error': 'invalid_request', 'error_description': 'Request body is too large' },
          { status: 400, headers },
        )
      }
      const encoded = new TextDecoder().decode(body)
      form = new URLSearchParams(encoded)
      break
    }
    default: {
      // 405
      return Response.json(
        { 'error': 'invalid_request', 'error_description': 'Unsupported HTTP method' },
        { status: 400, headers },
      )
    }
  }

  const [validClientAndRedirectUri, clientAndRedirectUri, clientAndRedirectUriError] = validateRequestParameters(
    form,
    authorizeRequestSchema.pick({
      'client_id': true,
      'redirect_uri': true,
    }),
  )
  if (!validClientAndRedirectUri) {
    return Response.json({ 'error': 'invalid_request', 'error_description': clientAndRedirectUriError }, { status: 400, headers })
  }

  const client = await clients.get(clientAndRedirectUri['client_id'])
  if (!client) {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Invalid client_id' }, { status: 400, headers })
  }

  const redirectUrl = redirectUris.validate(client, clientAndRedirectUri['redirect_uri'])
  if (!redirectUrl) {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Invalid redirect_uri' }, { status: 400, headers })
  }

  const redirectWithError = (error: Record<string, string>) => {
    Object.entries(error)
      .forEach(([key, value]) => {
        redirectUrl.searchParams.set(key, value)
      })

    // because we use reference to `redirectUrl` variable, state also will be included
    redirectUrl.searchParams.sort()
    const status = context.request.method === 'GET' ? 302 : 303
    return context.redirect(redirectUrl.href, status)
  }

  const [validState, state, stateError] = validateRequestParameter('state', form, stateSchema)
  if (!validState) {
    return redirectWithError({ 'error': 'invalid_request', 'error_description': stateError })
  }
  redirectUrl.searchParams.set('state', state)

  try {
    const [validParameters, parameters, parametersError] = validateRequestParameters(
      form,
      authorizeRequestSchema.omit({
        'client_id': true,
        'redirect_uri': true,
        'state': true,
      }),
    )
    if (!validParameters) {
      return redirectWithError({ 'error': 'invalid_request', 'error_description': parametersError })
    }

    //  now only support 'code', reject implicit and hybrid flows
    if (!(parameters['response_type'].length === 1 && parameters['response_type'][0] === 'code')) {
      return redirectWithError({ 'error': 'unsupported_response_type' })
    }

    // if `scope` parameter is omitted then `*` will be granted
    //  to avoid that (least privilege access) we provide a safe default
    //  however for clients with restricted scopes this might cause error, thus they must provide scope explicitly
    // eslint-disable-next-line dot-notation
    const [validScope, scope, scopeError] = scopes.validate(client, parameters['scope'] ?? 'offline_access read')
    if (!validScope) {
      return redirectWithError({ 'error': 'invalid_scope', 'error_description': scopeError })
    }

    const consentRequest = await consents.create({
      clientId: client.id,
      // include here redirect_uri **as in request**
      redirectUri: clientAndRedirectUri['redirect_uri'],
      scope: scope.encode(),
      state,
      codeChallenge: parameters['code_challenge'],
      codeChallengeMethod: parameters['code_challenge_method'],
    })
    return context.redirect(`/consent?state=${consentRequest.token}`, context.request.method === 'GET' ? 302 : 303)
  }
  catch (e) {
    console.error(e)
    return redirectWithError({ 'error': 'server_error' })
  }
}

export const token: APIRoute = async (context) => {
  const headers = new Headers()
  headers.set('cache-control', 'no-store')
  headers.set('pragma', 'no-cache') // will be deprecated in 2.1

  if (context.request.method !== 'POST') {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Unsupported HTTP method' }, { status: 400, headers })
  }

  if (context.request.headers.get('content-type') !== 'application/x-www-form-urlencoded') {
    return Response.json(
      {
        'error': 'invalid_request',
        'error_description': 'Invalid Content-Type, application/x-www-form-urlencoded expected',
      },
      { status: 400, headers },
    )
  }

  const [success, body] = await readBodyWithLimit(context.request.clone(), 5 * 1024)
  if (!success) {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Request body is too large' }, { status: 400, headers })
  }
  const encoded = new TextDecoder().decode(body)
  const form = new URLSearchParams(encoded)

  const [validClientAuth, clientAuthHandlers, clientAuthError] = validateClientAuth(form, context.request.headers)
  if (!validClientAuth) {
    return Response.json({ 'error': 'invalid_request', 'error_description': clientAuthError }, { status: 400, headers })
  }

  if (clientAuthHandlers.length > 1) {
    return Response.json(
      {
        'error': 'invalid_request',
        'error_description': 'Request includes multiple credentials',
      },
      { status: 400, headers },
    )
  }

  // A client MAY use the "client_id" request parameter to identify itself when sending requests to the token endpoint
  const [validClientId, clientId, clientIdError] = validateRequestParameter('client_id', form, clientIdSchema.optional())
  if (!validClientId) {
    return Response.json({ 'error': 'invalid_request', 'error_description': clientIdError }, { status: 400, headers })
  }

  let client
  const clientAuthHandler = clientAuthHandlers[0]
  if (clientAuthHandler) {
    client = await clientAuthHandler.handle()
  }
  else if (clientId) {
    // try to identify (potentially public) client with client_id parameter instead
    client = await clients.identity(clientId)
  }
  else {
    return respondWithInvalidClient('No client authentication included', headers)
  }

  if (!client) {
    return respondWithInvalidClient('Client authentication failed', headers)
  }
  if (clientId && client.id !== clientId) {
    return respondWithInvalidClient('client_id does not match authenticated client', headers)
  }

  const [validGrantType, grantHandler, grantTypeError] = validateGrantType(form)
  if (!validGrantType) {
    return Response.json({ 'error': 'invalid_request', 'error_description': grantTypeError }, { status: 400, headers })
  }
  if (!grantHandler) {
    return Response.json({ 'error': 'unsupported_grant_type' }, { status: 400, headers })
  }
  if (!client.grantTypes.includes(grantHandler.grantType)) {
    return Response.json({ 'error': 'unauthorized_client' }, { status: 400, headers })
  }

  const grant = await grantHandler.handle(client)
  if (!grant) {
    return Response.json({ 'error': 'invalid_grant' }, { status: 400, headers })
  }

  const [validScope, scope, scopeError] = scopes.validate(client, grantHandler.requestScope, grant.scope)
  if (!validScope) {
    return Response.json({ 'error': 'invalid_scope', 'error_description': scopeError }, { status: 400, headers })
  }

  // because there's small amount of extensions and to simplify it now, I will keep it inline
  //  maybe in future array of response write handlers can be called so they kinda form the final response
  const generateRefreshToken = async () => {
    if (!scope.has('offline_access')) {
      return null
    }
    // in refresh_token grant, grant id is equals to current refresh_token id
    const tokenId = grantHandler.grantType === 'refresh_token' ? grant.id : undefined
    const refreshToken = await refreshTokens.create(client.id, grant.userId, grant.scope, tokenId)
    const token = [refreshToken.id, refreshToken.secret, refreshToken.signature].join('.')
    return token
  }

  const expiresIn = 60 * 3
  const token = await jwt.encode({
    typ: 'at+JWT',
    key: 'sig.oauth.access_token',
    expiresIn,
    claims: {
      'sub': grant.userId,
      'aud': 'http://localhost:4321', // static for now, resource parameter implementation is needed
      'client_id': client.id,
      'scope': scope.encode(),
      // auth_time, acr, amr out of scope now, but should be simply link session
    },
  })
  const refreshToken = await generateRefreshToken()

  return Response.json(
    {
      'access_token': token,
      'token_type': 'bearer', // value is case insensitive
      'expires_in': expiresIn,
      'refresh_token': refreshToken ?? undefined,
      'scope': scope.encode(),
    },
    { status: 200, headers },
  )
}
