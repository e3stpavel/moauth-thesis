import { base64url } from '@moauth/encoding'
import { db, eq, RefreshToken } from 'astro:db'
import { randomCUID } from '~/utils/cuid'
import * as hasher from '~/utils/hasher'
import { HMAC_KEY } from '~/utils/keys'

// refresh token is long-lasting credential that only expires when client doesn't use it
const ACTIVE_REFRESH_TOKEN_DURATION_SECONDS = 60 * 60 * 24 * 5

/** Creates refresh_token, if `tokenId` provided then it'll try to rotate existing refresh_token */
export async function create(clientId: string, userId: string, scope: string, tokenId = randomCUID()) {
  const bytes = crypto.getRandomValues(new Uint8Array(40))
  const secret = base64url.encode(bytes)
  const secretHash = await hasher.hash(secret)
  await db
    .insert(RefreshToken)
    .values({
      id: tokenId,
      secretHash,
      clientId,
      userId,
      scope,
    })
    .onConflictDoUpdate({
      target: RefreshToken.id,
      set: {
        secretHash,
        lastVerifiedAt: new Date(),
      },
    })

  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.sign(
    { name: 'HMAC' },
    HMAC_KEY,
    encoder.encode([tokenId, 'moauth', secret].join('.')),
  )
  const signature = base64url.encode(new Uint8Array(buffer))

  return {
    id: tokenId,
    secret,
    signature,
  }
}

export async function get(tokenId: string, secret: string, signature: string, clientId: string) {
  const encoder = new TextEncoder()
  const validSignature = await crypto.subtle.verify(
    { name: 'HMAC' },
    HMAC_KEY,
    base64url.decode(signature),
    encoder.encode([tokenId, 'moauth', secret].join('.')),
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

  if (refreshToken.clientId !== clientId) {
    return null
  }

  return {
    id: refreshToken.id,
    userId: refreshToken.userId,
    scope: refreshToken.scope,
  }
}
