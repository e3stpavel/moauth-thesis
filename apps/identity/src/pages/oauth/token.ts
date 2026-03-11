import type { APIRoute } from 'astro'
import { InvalidClientError, InvalidRequestError, TokenError } from '~/core/oauth/error'
import { FormUrlEncodedBody } from '~/utils/oauth/context/body'

export const POST: APIRoute = async (context) => {
  try {
    if (context.request.headers.get('Content-Type') !== 'application/x-www-form-urlencoded') {
      throw new InvalidRequestError(
        'Invalid \'Content-Type\', expected \'application/x-www-form-urlencoded\'',
        'https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3',
      )
    }

    const formUrlEncoded = await context.request.text()
    const body = new FormUrlEncodedBody(formUrlEncoded)

    console.log(body)

    return Response.json(null)
  }
  catch (error) {
    const headers = new Headers()
    headers.set('Cache-Control', 'no-store')
    headers.set('Pragma', 'no-cache')

    if (error instanceof TokenError) {
      let status = 400
      if (error instanceof InvalidClientError) {
        status = 401
        headers.set('WWW-Authenticate', 'Basic realm="oauth"')
      }

      return Response.json(
        {
          error: error.code,
          error_description: error.message ? error.message : undefined,
          error_uri: error.reference ? error.reference : undefined,
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
