import { timingSafeEqual } from 'node:crypto'
import { hexLowercase } from '@minoauth/encoding'

export async function digest(str: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return hexLowercase.encode(new Uint8Array(buffer))
}

export async function verify(strHash: string, str: string) {
  const encoder = new TextEncoder()
  const hash = await digest(str)
  return timingSafeEqual(
    encoder.encode(strHash),
    encoder.encode(hash),
  )
}
