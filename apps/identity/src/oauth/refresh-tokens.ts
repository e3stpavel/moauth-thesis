import { base64url } from '@moauth/encoding'
import { db, eq, RefreshToken } from 'astro:db'
import { randomCUID } from '~/utils/cuid'
import * as hasher from '~/utils/hasher'
import { HMAC_KEY } from '~/utils/keys'

// refresh token is long-lasting credential that only expires when client doesn't use it
const ACTIVE_REFRESH_TOKEN_DURATION_SECONDS = 60 * 60 * 24 * 5

type SaveRefreshToken = (secretHash: string) => Promise<string>

async function generate(save: SaveRefreshToken) {
  const bytes = crypto.getRandomValues(new Uint8Array(40))
  const secret = base64url.encode(bytes)
  const secretHash = await hasher.hash(secret)
  const tokenId = await save(secretHash)

  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.sign(
    { name: 'HMAC' },
    HMAC_KEY,
    encoder.encode([tokenId, secret].join('.')),
  )
  const signature = base64url.encode(new Uint8Array(buffer))

  return {
    id: tokenId,
    secret,
    signature,
  }
}

type NewRefreshToken = Pick<typeof RefreshToken.$inferInsert, 'clientId' | 'userId' | 'scope'>

export async function create(refreshToken: NewRefreshToken) {
  return generate(async (secretHash) => {
    const tokenId = randomCUID()
    await db
      .insert(RefreshToken)
      .values({
        id: tokenId,
        secretHash,
        ...refreshToken,
      })
    return tokenId
  })
}

export async function rotate(tokenId: string) {
  return generate(async (secretHash) => {
    await db
      .update(RefreshToken)
      .set({
        secretHash,
        lastVerifiedAt: new Date(),
      })
      .where(
        eq(RefreshToken.id, tokenId),
      )
    return tokenId
  })
}

export async function get(tokenId: string, secret: string, signature: string) {
  const encoder = new TextEncoder()
  const validSignature = await crypto.subtle.verify(
    { name: 'HMAC' },
    HMAC_KEY,
    base64url.decode(signature),
    encoder.encode([tokenId, secret].join('.')),
  )
  if (!validSignature) {
    return null
  }

  const [refreshToken] = await db
    .select()
    .from(RefreshToken)
    .where(
      eq(RefreshToken.id, tokenId),
    )

  if (!refreshToken) {
    return null
  }

  const expiresAt = refreshToken.lastVerifiedAt.getTime() + 1000 * ACTIVE_REFRESH_TOKEN_DURATION_SECONDS
  if (Date.now() >= expiresAt) {
    await db.delete(RefreshToken).where(eq(RefreshToken.id, refreshToken.id))
    return null
  }

  const validSecret = await hasher.verify(refreshToken.secretHash, secret)
  if (!validSecret) {
    // most likely refresh_token was already used, attacker managed to get new access_token and rotated refresh_token
    //  now when legitimate client tries to refresh access_token, it uses invalid refresh_token (signature is valid, but secret is not)
    //  because we don't know who is good and who's bad, invalidating the token will "logout" everyone
    await db.delete(RefreshToken).where(eq(RefreshToken.id, refreshToken.id))
    return null
  }

  return refreshToken
}
