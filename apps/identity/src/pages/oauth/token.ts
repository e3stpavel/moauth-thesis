import type { APIRoute } from 'astro'
import type { Context } from '~/core/oauth/token/request'
import { InvalidClientError, InvalidRequestError, TokenEndpointError } from '~/core/oauth/token/error'
import { TokenEndpointAuth, TokenEndpointBody } from '~/core/oauth/token/request'

export const POST: APIRoute = async ({ request }) => {
  const headers = new Headers()
  headers.set('Cache-Control', 'no-store')
  headers.set('Pragma', 'no-cache')

  try {
    if (request.headers.get('Content-Type') !== 'application/x-www-form-urlencoded') {
      throw new InvalidRequestError(
        'Invalid \'Content-Type\', expected \'application/x-www-form-urlencoded\'',
        'https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3',
      )
    }

    // TODO: limit body size
    // https://github.com/withastro/astro/blob/a2f597d02c70c1d8aa4b0f88168de6a8b5f5186e/packages/astro/src/actions/runtime/server.ts#L258
    const formUrlEncodedBody = await request.text()
    const context: Context = {
      auth: request.headers.has('Authorization')
        ? new TokenEndpointAuth(request.headers.get('Authorization')!)
        : undefined,
      body: new TokenEndpointBody(formUrlEncodedBody),
      signal: request.signal,
    }

    console.log(context)

    return Response.json(null, { status: 200, headers })
  }
  catch (error) {
    if (error instanceof TokenEndpointError) {
      let status = 400
      if (error instanceof InvalidClientError) {
        status = 401
        headers.set('WWW-Authenticate', 'Basic realm="oauth"')
      }

      return Response.json(
        {
          error: error.code,
          error_description: error.message,
          error_uri: error.reference,
        },
        { status, headers },
      )
    }

    return Response.json(
      {
        error: 'server_error',
        error_description: 'The authorization server encountered an unexpected condition that prevented it from fulfilling the request',
      },
      { status: 500, headers },
    )
  }
}
