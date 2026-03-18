import * as encoding from '@oslojs/encoding'
import { z } from 'astro/zod'

export const regex = /^[0-9A-F]+$/

export function validate(encoded: string): boolean {
  const validation = z.string().regex(regex).safeParse(encoded)
  return validation.success
}

export function encode(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeHexUpperCase(data)
}

export function decode(encoded: string): Uint8Array<ArrayBuffer> {
  const data = encoding.decodeHex(encoded)
  return new Uint8Array(data)
}
