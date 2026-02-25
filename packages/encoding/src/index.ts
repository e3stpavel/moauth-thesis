import * as encoding from '@oslojs/encoding'
import { z } from 'astro/zod'

export function validateHexLowercase(encoded: string): boolean {
  const validation = z.string().regex(/^[0-9a-f]+$/).safeParse(encoded)
  return validation.success
}

export function encodeHexLowerCase(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeHexLowerCase(new Uint8Array(data))
}

export function validateHexUppercase(encoded: string): boolean {
  const validation = z.string().regex(/^[0-9A-F]+$/).safeParse(encoded)
  return validation.success
}

export function encodeHexUpperCase(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeHexUpperCase(new Uint8Array(data))
}

export function decodeHex(encoded: string): Uint8Array<ArrayBuffer> {
  const data = encoding.decodeHex(encoded)
  return new Uint8Array(data)
}

export function validateBase64(encoded: string): boolean {
  const validation = z.string().base64().safeParse(encoded)
  return validation.success
}

export function encodeBase64(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeBase64(new Uint8Array(data))
}

export function decodeBase64(encoded: string): Uint8Array<ArrayBuffer> {
  const data = encoding.decodeBase64(encoded)
  return new Uint8Array(data)
}
