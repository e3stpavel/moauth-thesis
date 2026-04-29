/* eslint-disable antfu/no-top-level-await */

export const HMAC_KEY = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

export const ED25519_KEY_PAIR = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign'])

export const RSA_KEY_PAIR = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    modulusLength: 3072,
    publicExponent: new Uint8Array([1, 0, 1]),
  },
  false,
  ['sign'],
)
