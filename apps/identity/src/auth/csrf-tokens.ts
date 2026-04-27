import { timingSafeEqual } from 'node:crypto'
import { base64, base64url } from '@moauth/encoding'

export function generate() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const token = base64.encode(bytes)
  return token
}

export function mask(raw: string) {
  const bytes = base64.decode(raw)
  const nonce = crypto.getRandomValues(new Uint8Array(bytes.length))
  const mask = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    mask[i] = bytes[i]! ^ nonce[i]!
  }

  const token = new Uint8Array(bytes.length * 2)
  token.set(nonce)
  token.set(mask, bytes.length)

  return base64url.encode(token)
}

export function verify(masked: string, raw: string) {
  const bytes = base64.decode(raw)
  const token = base64url.decode(masked)
  if (bytes.length !== token.length / 2) {
    return false
  }

  const nonce = token.slice(0, bytes.length)
  const mask = token.slice(bytes.length)
  const bytesFromToken = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    bytesFromToken[i] = mask[i]! ^ nonce[i]!
  }

  return timingSafeEqual(bytes, bytesFromToken)
}
