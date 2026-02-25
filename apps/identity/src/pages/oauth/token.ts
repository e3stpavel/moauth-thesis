import type { APIRoute } from 'astro'
import { authenticateClient } from '~/core/oauth/client-authentication'
import { InvalidClientError, InvalidRequestError, TokenError } from '~/core/oauth/error'

export const POST: APIRoute = async (context) => {
  try {
    if (context.request.headers.get('Content-Type') !== 'application/x-www-form-urlencoded') {
      throw new InvalidRequestError(
        'Invalid \'Content-Type\', expected \'application/x-www-form-urlencoded\'',
        'https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3',
      )
    }

    const body = await context.request.formData()
    const client = await authenticateClient({
      body,
      headers: context.request.headers,
      locals: context.locals,
    })

    console.log(client)

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

    return Response.json({ error: 'server_error' }, { status: 500, headers })
  }
}
