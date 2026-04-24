import { timingSafeEqual } from 'node:crypto'
import { hex } from '@moauth/encoding'

/**
 * Hashes tokens before storage
 */
export async function hash(str: string) {
  const bytes = new TextEncoder().encode(str)
  const buffer = await crypto.subtle.digest('SHA-256', bytes)
  return hex.lowercase.encode(new Uint8Array(buffer))
}

/**
 * Verifies hashed token from storage against plaintext in constant time
 */
export async function verify(hashed: string, str: string) {
  const encoder = new TextEncoder()
  const strHash = await hash(str)
  return timingSafeEqual(
    encoder.encode(hashed),
    encoder.encode(strHash),
  )
}
