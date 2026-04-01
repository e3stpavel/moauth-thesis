import { describe, expect, it } from 'vitest'
import * as jwk from '~/utils/jwk'

describe('calculateThumbprint', () => {
  it('calculates for RSA', async () => {
    // https://datatracker.ietf.org/doc/html/rfc7638#section-3.1
    const publicKey = {
      kty: 'RSA',
      n: '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
      e: 'AQAB',
      alg: 'RS256',
    }

    const thumbprint = await jwk.calculateThumbprint(publicKey)

    expect(thumbprint).toBe('NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs')
  })

  it('calculates for EC', async () => {
    const publicKey = {
      key_ops: ['verify'],
      ext: true,
      kty: 'EC',
      x: 'e5dGd5DNOLNUvyrwCpB02C21hSiU-J5VwouI15KcEPQ',
      y: 'jWptYvITVvo5ki7NouJUaLjnc3bAhmKnYR1Cg9yLJ-c',
      crv: 'P-256',
    }

    const thumbprint = await jwk.calculateThumbprint(publicKey)

    // used https://kjur.github.io/jsrsasign/sample/tool_jwktp.html
    expect(thumbprint).toBe('lg8Lp8QLO82CevjTb4zQcmR-h4UMKNvqimjc4ONl5wk')
  })

  it('calculates for EdDSA', async () => {
    // https://datatracker.ietf.org/doc/html/rfc8037#appendix-A.3
    const publicKey = {
      crv: 'Ed25519',
      kty: 'OKP',
      x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
    }

    const thumbprint = await jwk.calculateThumbprint(publicKey)

    expect(thumbprint).toBe('kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k')
  })

  it('calculates for HMAC', async () => {
    const key = {
      key_ops: ['sign', 'verify'],
      ext: true,
      alg: 'HS256',
      kty: 'oct',
      k: 'mTR8qK_zLOt_hodljqv7FifLvjSjJfWcc82cELFM_uYeplUXyIKT-EF87sGQ6i-pTx9CVeemh3HtAuRZIs_mwA',
    }

    const thumbprint = await jwk.calculateThumbprint(key)

    expect(thumbprint).toBe('fDNs8AjI0PZFZ-NsdwnvLHxW3j_aWlwgq7sg2xPbgTI')
  })

  it('calculates for AES', async () => {
    const key = {
      key_ops: ['encrypt', 'decrypt'],
      ext: true,
      alg: 'A256GCM',
      kty: 'oct',
      k: 'oHDSKUZvBgT-I1FEI_a_28-BUh4AguH0i4T4yjwYjWs',
    }

    const thumbprint = await jwk.calculateThumbprint(key)

    expect(thumbprint).toBe('ktkQVX-_a7Ztc8k6roNxRK1Sgu5oQiuS0bwQPvm0Z2I')
  })
})
