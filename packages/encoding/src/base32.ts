import { decodeBase32IgnorePadding, encodeBase32LowerCaseNoPadding } from '@oslojs/encoding'
import { z } from 'astro/zod'

export const regex = /^[a-z2-7]+$/

export function validate(encoded: string): boolean {
  const validation = z.string().regex(regex).safeParse(encoded)
  return validation.success
}

export function encode(data: Uint8Array<ArrayBuffer>): string {
  return encodeBase32LowerCaseNoPadding(data)
}

export function decode(encoded: string): Uint8Array<ArrayBuffer> {
  const data = decodeBase32IgnorePadding(encoded)
  return new Uint8Array(data)
}
