import type { Context } from '~/core/oauth/token/request'
import { logger } from 'minoauth:logger'
import * as clientAuth from '~/core/oauth/token/client-auth'
import { InvalidClientError } from '~/core/oauth/token/error'

export function handleClientAuthRequest(context: Context) {
  const clientAuthRequest = clientAuth.validateRequest(context)

  switch (clientAuthRequest.method) {
    case 'client_secret_basic':
    case 'client_secret_post':
      return clientAuth.handleClientSecretRequest(clientAuthRequest)

    case 'none':
      return clientAuth.handleNoneRequest(clientAuthRequest)

    default:
      logger.error('No matching handler to handle client authentication request')
      throw new InvalidClientError()
  }
}

export async function handleTokenRequest(context: Context) {
  const client = await handleClientAuthRequest(context)
}
