import { base32 } from '@moauth/encoding'
import { AuthorizationCode, db, eq } from 'astro:db'
import * as hasher from '~/utils/hasher'

const MAX_AUTHORIZATION_CODE_DURATION_SECONDS = 60

type NewAuthorizationCode = Omit<typeof AuthorizationCode.$inferInsert, 'id' | 'createdAt'>

export async function create(authorizationCode: NewAuthorizationCode) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = base32.encode(bytes)
  const id = await hasher.hash(token)
  await db
    .insert(AuthorizationCode)
    .values({
      ...authorizationCode,
      id,
    })

  return { token }
}

export async function use(token: string) {
  const id = await hasher.hash(token)
  const [authorizationCode] = await db
    .delete(AuthorizationCode)
    .where(
      eq(AuthorizationCode.id, id),
    )
    .returning()

  // TODO: detect code reuse and invalidate all access/refresh tokens
  //  looking for tokens when anyone tries crap with "valid" looking codes is not good, sign code with HMAC?
  if (!authorizationCode) {
    return null
  }

  if (Date.now() - authorizationCode.createdAt.getTime() >= 1000 * MAX_AUTHORIZATION_CODE_DURATION_SECONDS) {
    return null
  }

  return authorizationCode
}
