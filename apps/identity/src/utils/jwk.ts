import { base64url } from '@minoauth/encoding'

export async function calculateThumbprint(publicKey: JsonWebKey) {
  const jwk = Object.fromEntries(
    Object.entries(publicKey)
      .filter(([key]) => ['crv', 'kty', 'x', 'y', 'e', 'n', 'k'].includes(key)) // select required members
      // TODO: https://stackoverflow.com/questions/70135031/how-to-sort-strings-in-javascript-by-code-point-values
      //  it is not according to spec now but it works, also see below how other implement it
      //  https://github.com/distribution/distribution/pull/4626
      //  https://github.com/panva/jose/blob/main/src/jwk/thumbprint.ts
      .sort(),
  )

  const json = JSON.stringify(jwk)
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  return base64url.encode(new Uint8Array(buffer))
}
