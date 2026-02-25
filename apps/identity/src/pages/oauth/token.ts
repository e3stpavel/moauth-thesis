import type { APIRoute } from 'astro'
import { decodeBase64, validateBase64 } from '@minoauth/encoding'
import { clientCredentialsSchema } from '~/core/oauth/client/schema'
import { authorizationCodeRequestSchema } from '~/core/oauth/token/authorization-code/schema'
import { refreshTokenRequestSchema } from '~/core/oauth/token/refresh-token/schema'

function validateBodyCredentials(body: FormData) {
  const validation = clientCredentialsSchema
    .partial({ clientSecret: true })
    .safeParse({
      clientId: body.get('client_id'),
      // zod partial doesn't accept null values
      clientSecret: body.get('client_secret') ?? undefined,
    })

  if (!validation.success) {
    return
  }

  return validation.data
}

function validateBasicCredentials(basicAuthorization: string) {
  const [authType, credentials] = basicAuthorization.split(' ')
  if (!(authType && credentials)) {
    return
  }

  if (authType !== 'Basic') {
    return
  }

  const isValidCredentials = validateBase64(credentials)
  if (!isValidCredentials) {
    return
  }

  const [clientId, clientSecret] = new TextDecoder().decode(decodeBase64(credentials)).split(':')
  const validation = clientCredentialsSchema.safeParse({ clientId, clientSecret })
  if (!validation.success) {
    return
  }

  return validation.data
}

export const POST: APIRoute = async (context) => {
  if (context.request.headers.get('Content-Type') !== 'application/x-www-form-urlencoded') {
    return Response.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid \'Content-Type\', expected \'application/x-www-form-urlencoded\'',
        error_uri: 'https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3',
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  const body = await context.request.formData()

  const isBodyCredentials = body.has('client_id') || body.has('client_secret')
  const isBasicCredentials = context.request.headers.has('Authorization')

  if (isBodyCredentials && isBasicCredentials) {
    return Response.json(
      {
        error: 'invalid_request',
        error_description: 'The client must not use more than one authentication method in each request',
        error_uri: 'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  if (!isBodyCredentials && !isBasicCredentials) {
    return Response.json(
      {
        error: 'invalid_client',
        error_description: 'Confidential clients or other clients issued client credentials must authenticate',
        error_uri: 'https://datatracker.ietf.org/doc/html/rfc6749#section-2.3',
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'WWW-Authenticate': 'Basic realm="oauth"',
        },
      },
    )
  }

  let clientCredentials
  if (isBodyCredentials) {
    clientCredentials = validateBodyCredentials(body)
  }

  if (isBasicCredentials) {
    clientCredentials = validateBasicCredentials(context.request.headers.get('Authorization')!)
  }

  if (!clientCredentials) {
    return Response.json(
      {
        error: 'invalid_client',
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'WWW-Authenticate': 'Basic realm="oauth"',
        },
      },
    )
  }

  console.log(clientCredentials)

  const grantType = body.get('grant_type')
  if (grantType === 'authorization_code') {
    const validation = authorizationCodeRequestSchema.safeParse({
      code: body.get('code'),
      redirectUri: body.get('redirect_uri'),
    })
    if (!validation.success) {
      const { message, path } = validation.error.issues.at(0)!
      return Response.json(
        {
          error: 'invalid_request',
          error_description: `${message}${path.length > 0 ? ` (${path.join('.')})` : ''}`,
          error_uri: 'https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3',
        },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    console.log('code')
  }
  else if (grantType === 'refresh_token') {
    const validation = refreshTokenRequestSchema.safeParse({
      refreshToken: body.get('refresh_token'),
    })
    if (!validation.success) {
      const { message, path } = validation.error.issues.at(0)!
      return Response.json(
        {
          error: 'invalid_request',
          error_description: `${message}${path.length > 0 ? ` (${path.join('.')})` : ''}`,
          error_uri: 'https://datatracker.ietf.org/doc/html/rfc6749#section-6',
        },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    console.log('refresh token')
  }
  else if (grantType === 'client_credentials') {
    console.log('client credentials')
  }
  else {
    return Response.json(
      {
        error: 'unsupported_grant_type',
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  const data = Object.fromEntries(body)

  console.log(data)

  return Response.json(null)
}
