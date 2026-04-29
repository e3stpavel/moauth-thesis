import { base64url } from '@moauth/encoding'
import { randomCUID } from '~/utils/cuid'
import { RSA_KEY_PAIR } from './keys'

interface Options {
  /** @default 'JWT' */
  typ?: string
  key: string
  /** in seconds */
  expiresIn: number
  claims?: Record<string, string | number>
}

export async function encode(options: Options) {
  // now ignores key label, uses RS256
  const header = {
    typ: options.typ ?? 'JWT',
    kid: 'temp-rsa-key',
    alg: 'RS256',
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + options.expiresIn
  const payload = {
    'iss': import.meta.env.SITE,
    'exp': expiresAt,
    'iat': issuedAt,
    'jti': randomCUID(),
    ...options.claims,
  }

  const encoder = new TextEncoder()
  const body = [header, payload]
    .map((member) => {
      const serialized = JSON.stringify(member)
      const bytes = encoder.encode(serialized)
      return base64url.encode(bytes)
    })
    .join('.')

  const buffer = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    RSA_KEY_PAIR.privateKey,
    encoder.encode(body),
  )
  const signature = base64url.encode(new Uint8Array(buffer))
  const token = [body, signature].join('.')
  return token
}
