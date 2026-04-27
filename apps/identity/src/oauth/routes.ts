import type { APIRoute } from 'astro'
import { readBodyWithLimit } from '~/utils/body'
import * as authorizationCodes from './authorization-codes'
import { redirectWithError, validateRedirectUri } from './authorize'
import * as clients from './clients'
import * as consents from './consents'
import { authorizationCodeGrantSchema, authorizeRequestSchema, clientIdSchema, stateSchema } from './models'
import { validateRequestParameter, validateRequestParameters } from './parameters'
import { validateScope } from './scopes'
import { respondWithInvalidClient, validateClientAuthRequest } from './token'

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

  const redirectUrl = validateRedirectUri(client, clientAndRedirectUri['redirect_uri'])
  if (!redirectUrl) {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Invalid redirect_uri' }, { status: 400, headers })
  }

  const [validState, state, stateError] = validateRequestParameter('state', form, stateSchema)
  if (!validState) {
    return redirectWithError(context, redirectUrl, { 'error': 'invalid_request', 'error_description': stateError })
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
      return redirectWithError(context, redirectUrl, { 'error': 'invalid_request', 'error_description': parametersError })
    }

    // TODO: pick strategy
    //  scopes are resolved also depending on strategy, i.e. forbid offline_access for client_credentials flow
    //  but now only support 'code', reject implicit and hybrid flows
    if (!(parameters['response_type'].length === 1 && parameters['response_type'][0] === 'code')) {
      return redirectWithError(context, redirectUrl, { 'error': 'unsupported_response_type' })
    }

    // eslint-disable-next-line dot-notation
    const [validScope, scope] = validateScope('authorization_code', client, parameters['scope'])
    if (!validScope) {
      return redirectWithError(context, redirectUrl, { 'error': 'invalid_scope' })
    }

    // include here redirect_uri **as in request**
    const consentRequest = await consents.create(client.id, clientAndRedirectUri['redirect_uri'], scope, state)
    return context.redirect(`/consent?state=${consentRequest.id}`, context.request.method === 'GET' ? 302 : 303)
  }
  catch (e) {
    console.error(e)
    return redirectWithError(context, redirectUrl, { 'error': 'server_error' })
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

  const [validClientAuthRequest, clientAuthHandlers, clientAuthRequestError] = validateClientAuthRequest(
    form,
    context.request.headers,
  )
  if (!validClientAuthRequest) {
    return Response.json({ 'error': 'invalid_request', 'error_description': clientAuthRequestError }, { status: 400, headers })
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
    client = await clientAuthHandler()
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

  // select grant_type, validate appropriate request parameters, unsupported_grant_type
  // unauthorized_client - The authenticated client is not authorized to use this authorization grant type (client_credentials)

  // before select validate parameters -> invalid_request (like in client auth)
  // after selecting grant_type, if selected is null -> unsupported_grant_type
  // after that we can get from handler grant_type name and compare against list of possible for client -> unauthorized_client
  // then call grant_type handler and if error -> invalid_grant
  // TODO: invalid_scope for refresh_token, client_credentials?

  // wip: keep only `authorization_code` now
  const [validParameters, parameters, parametersError] = validateRequestParameters(form, authorizationCodeGrantSchema)
  if (!validParameters) {
    return Response.json({ 'error': 'invalid_request', 'error_description': parametersError }, { status: 400, headers })
  }

  // eslint-disable-next-line dot-notation
  const authorizationCode = await authorizationCodes.use(parameters['code'], client, parameters['redirect_uri'])
  if (!authorizationCode) {
    return Response.json({ 'error': 'invalid_grant' }, { status: 400, headers })
  }

  // create access_token and refresh_token (if offline_access)

  return Response.json({})
}
