import type { Client } from './clients'
import * as clients from './clients'
import { clientSecretBasicSchema, clientSecretPostSchema } from './models'
import { validateRequestParameters } from './parameters'

type Handler = () => Promise<Client | null>

type Result<T> = [true, T, undefined] | [false, undefined, string]

export function validateClientAuthRequest(form: URLSearchParams, headers: Headers): Result<Handler[]> {
  const handlers = []

  // client_secret_basic, overall we support only `Basic` scheme only
  if (headers.has('authorization')) {
    const validation = clientSecretBasicSchema.safeParse(headers.get('authorization'))
    if (!validation.success) {
      return [false, undefined, 'Invalid authorization']
    }
    handlers.push(
      () => clients.authenticate(...validation.data),
    )
  }

  // client_secret_post
  if (form.has('client_secret')) {
    const [valid, parameters, error] = validateRequestParameters(form, clientSecretPostSchema)
    if (!valid) {
      return [false, undefined, error]
    }
    handlers.push(
      () => clients.authenticate(parameters['client_id'], parameters['client_secret']),
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
