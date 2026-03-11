import * as encoding from '@oslojs/encoding'
import { z } from 'astro/zod'

// ' %&+£€' => '+%25%26%2B%C2%A3%E2%82%AC'
//  https://datatracker.ietf.org/doc/html/rfc6749#appendix-B
export function encodeFormUrlEncoded(data: string): string {
  const params = new URLSearchParams()
  params.append('q', data)
  return params.toString().slice('q='.length)
}

export function decodeFormUrlEncoded(encoded: string): string {
  const params = new URLSearchParams(`q=${encoded}`)
  return params.get('q')!
}

const hexLowercaseRegex = /^[0-9a-f]+$/

export function validateHexLowercase(encoded: string): boolean {
  const validation = z.string().regex(hexLowercaseRegex).safeParse(encoded)
  return validation.success
}

export function encodeHexLowercase(data: Uint8Array<ArrayBuffer>): string {
  return encoding.encodeHexLowerCase(new Uint8Array(data))
}

const hexUppercaseRegex = /^[0-9A-F]+$/

export function validateHexUppercase(encoded: string): boolean {
  const validation = z.string().regex(hexUppercaseRegex).safeParse(encoded)
  return validation.success
}

export function encodeHexUppercase(data: Uint8Array<ArrayBuffer>): string {
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
