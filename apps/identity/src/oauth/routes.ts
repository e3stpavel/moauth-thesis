import type { APIRoute } from 'astro'
import { readBodyWithLimit } from '~/utils/body'
import { redirectWithError, validateRedirectUri } from './authorize'
import * as clients from './clients'
import * as consents from './consents'
import { authorizeRequestSchema, stateSchema } from './models'
import { validateRequestParameter, validateRequestParameters } from './parameters'
import { validateScope } from './scopes'

export const authorize: APIRoute = async (context) => {
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
          { status: 400 },
        )
      }

      const [success, body] = await readBodyWithLimit(context.request.clone(), 5 * 1024)
      if (!success) {
        // 413
        //  https://datatracker.ietf.org/doc/html/rfc9126#section-2.3
        return Response.json({ 'error': 'invalid_request', 'error_description': 'Request body is too large' }, { status: 400 })
      }
      const encoded = new TextDecoder().decode(body)
      form = new URLSearchParams(encoded)
      break
    }
    default: {
      // 405
      return Response.json({ 'error': 'invalid_request', 'error_description': 'Unsupported HTTP method' }, { status: 400 })
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
    return Response.json({ 'error': 'invalid_request', 'error_description': clientAndRedirectUriError }, { status: 400 })
  }

  const client = await clients.get(clientAndRedirectUri['client_id'])
  if (!client) {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Invalid client_id' }, { status: 400 })
  }

  const redirectUrl = validateRedirectUri(client, clientAndRedirectUri['redirect_uri'])
  if (!redirectUrl) {
    return Response.json({ 'error': 'invalid_request', 'error_description': 'Invalid redirect_uri' }, { status: 400 })
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

    const consentRequest = await consents.create(client.id, redirectUrl.href, scope)
    return context.redirect(`/consent?state=${consentRequest.id}`, context.request.method === 'GET' ? 302 : 303)
  }
  catch (e) {
    console.error(e)
    return redirectWithError(context, redirectUrl, { 'error': 'server_error' })
  }
}
