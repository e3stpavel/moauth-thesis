import * as encoding from '@oslojs/encoding'
import { z } from 'astro/zod'

export function validate(encoded: string): boolean {
  const validation = z.string().base64().safeParse(encoded)
  return validation.success
}

export function encode(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeBase64(data)
}

export function decode(encoded: string): Uint8Array<ArrayBuffer> {
  const data = encoding.decodeBase64(encoded)
  return new Uint8Array(data)
}
