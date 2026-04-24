import { base32 } from '@moauth/encoding'
import { db, eq, Session, User } from 'astro:db'
import { randomCUID } from '~/utils/cuid'
import hasher from '~/utils/hasher'

const MAX_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30
const ACTIVE_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 6
const SESSION_INACTIVITY_TIMEOUT_SECONDS = 60 * 60 * 1

async function start() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = base32.encode(bytes)

  const secretHash = await hasher.hash(secret)
  const [session] = await db
    .insert(Session)
    .values({
      id: randomCUID(),
      secretHash,
    })
    .returning()

  return {
    id: session!.id,
    secret,
    expiresIn: ACTIVE_SESSION_DURATION_SECONDS,
  }
}

async function get(sessionId: string, secret: string) {
  const [row] = await db
    .select({
      session: Session,
      // user: User,
    })
    .from(Session)
    .where(eq(Session.id, sessionId))
    // .innerJoin(User, eq(User.id, Session.userId))

  if (!row) {
    return null
  }

  const session = row.session
  const expiresAt = Math.min(
    session.createdAt.getTime() + 1000 * MAX_SESSION_DURATION_SECONDS,
    session.lastVerifiedAt.getTime() + 1000 * ACTIVE_SESSION_DURATION_SECONDS,
  )
  if (Date.now() >= expiresAt) {
    await db.delete(Session).where(eq(Session.id, session.id))
    return null
  }

  const isSecretValid = await hasher.verify(session.secretHash, secret)
  if (!isSecretValid) {
    return null
  }

  return {
    id: session.id,
    expiresIn: Math.floor((expiresAt - Date.now()) / 1000),
    inactive: Date.now() - session.lastVerifiedAt.getTime() >= 1000 * SESSION_INACTIVITY_TIMEOUT_SECONDS,
  }
}

async function extend(sessionId: string) {
  await db
    .update(Session)
    .set({ lastVerifiedAt: new Date() })
    .where(eq(Session.id, sessionId))

  return {
    id: sessionId,
    expiresIn: ACTIVE_SESSION_DURATION_SECONDS,
  }
}

async function invalidate(sessionId: string) {
  await db
    .delete(Session)
    .where(eq(Session.id, sessionId))
}

export default { start, get, extend, invalidate }
