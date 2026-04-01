import * as encoding from '@oslojs/encoding'
import { z } from 'astro/zod'

// zod v3 allowed padding, so until zod v4 use this regex from
//  https://github.com/colinhacks/zod/blob/7d98c909329713cb2f478620f8a67aaf3ef40ce2/packages/zod/src/v4/core/regexes.ts#L75
export const regex = /^[\w-]*$/

export function validate(encoded: string): boolean {
  const validation = z.string().regex(regex).safeParse(encoded)
  return validation.success
}

export function encode(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeBase64urlNoPadding(data)
}

export function decode(encoded: string): Uint8Array<ArrayBuffer> {
  const data = encoding.decodeBase64urlIgnorePadding(encoded)
  return new Uint8Array(data)
}
