import { base64, formUrlEncoded } from '@minoauth/encoding'
import { z } from 'astro/zod'
import { clientIdSchema, clientSecretSchema } from '~/core/oauth/schema'
import { InvalidClientError } from '~/core/oauth/token/error'
import * as strings from '~/utils/strings'

// theoretically "authorization server MAY support any suitable authentication scheme",
//  but practically speaking we will only support "Basic", thus implementation is simplified
export class TokenEndpointAuth {
  public readonly clientId: string

  public readonly clientSecret: string

  constructor(authorization: string) {
    const [authScheme, authParams] = strings.splitN(authorization, ' ', 2)
    if (!(authScheme && authParams)) {
      // theoretically "authorization server MAY return an HTTP 401 (Unauthorized) status code to indicate which HTTP authentication schemes are supported",
      //  but practically speaking we will always return challenge for "Basic" scheme, thus implementation is simplified
      throw new InvalidClientError()
    }

    // case insensitive comparison
    if (authScheme.toLowerCase() !== 'basic') {
      throw new InvalidClientError()
    }

    // even though it must contain spaces after 'Basic', it could, so reconstruct original
    const isBase64Encoded = base64.validate(authParams)
    if (!isBase64Encoded) {
      throw new InvalidClientError()
    }

    const bytes = base64.decode(authParams)
    const credentials = new TextDecoder().decode(bytes)
    const [username, password] = strings.splitN(credentials, ':', 2)
    if (!(username && password)) {
      throw new InvalidClientError()
    }

    if (!(formUrlEncoded.validate(username) && formUrlEncoded.validate(password))) {
      throw new InvalidClientError(
        'Client credentials must be encoded using the \'application/x-www-form-urlencoded\' encoding algorithm',
        'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1',
      )
    }

    const validation = z.tuple([clientIdSchema, clientSecretSchema]).safeParse([
      formUrlEncoded.decode(username),
      formUrlEncoded.decode(password),
    ])
    if (!validation.success) {
      throw new InvalidClientError()
    }

    const [clientId, clientSecret] = validation.data
    this.clientId = clientId
    this.clientSecret = clientSecret
  }
}
