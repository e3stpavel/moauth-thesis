import type { Client } from './clients'
import * as parametersValidator from '~/utils/parameters-validator'
import * as clients from './clients'
import { clientSecretBasicSchema, clientSecretPostSchema } from './models'

interface ClientAuthHandler { handle: () => Promise<Client | null> }

type Result<T> = [true, T, undefined] | [false, undefined, string]

export function validate(form: URLSearchParams, headers: Headers): Result<ClientAuthHandler[]> {
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
    const [valid, parameters, error] = parametersValidator.validate(form, clientSecretPostSchema)
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
