import { ActionError, defineAction } from 'astro:actions'
import { db, eq, User } from 'astro:db'
import { randomCUID } from '~/utils/cuid'
import { credentialsSchema, registrationSchema } from './models'
import passwordHasher from './password-hasher'
import sessions from './sessions'

export const register = defineAction({
  input: registrationSchema,
  accept: 'form',
  handler: async (credentials, context) => {
    // user can have only single session right now
    if (context.locals.session) {
      throw new ActionError({
        code: 'FORBIDDEN',
      })
    }

    const passwordHash = await passwordHasher.hash(credentials.password)
    const [user] = await db
      .insert(User)
      .values({
        id: randomCUID(),
        email: credentials.email,
        passwordHash,
      })
      .onConflictDoNothing()
      .returning()

    if (!user) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: 'Email already taken',
      })
    }

    const session = await sessions.start()
    context.cookies.set('sessionid', session.id + session.secret, {
      path: '/',
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      httpOnly: true,
      maxAge: session.expiresIn,
    })
  },
})

export const login = defineAction({
  input: credentialsSchema,
  accept: 'form',
  handler: async (credentials, context) => {
    if (context.locals.session) {
      throw new ActionError({
        code: 'FORBIDDEN',
      })
    }

    const [user] = await db
      .select()
      .from(User)
      .where(
        eq(User.email, credentials.email),
      )

    if (!user) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: 'Invalid username or password',
      })
    }

    const isPasswordValid = await passwordHasher.verify(user.passwordHash, credentials.password)
    if (!isPasswordValid) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: 'Invalid username or password',
      })
    }

    const session = await sessions.start()
    context.cookies.set('sessionid', session.id + session.secret, {
      path: '/',
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      httpOnly: true,
      maxAge: session.expiresIn,
    })
  },
})

export const logout = defineAction({
  handler: async (_, context) => {
    const session = context.locals.session
    if (!session) {
      throw new ActionError({
        code: 'UNAUTHORIZED',
      })
    }

    await sessions.invalidate(session.id)
    context.cookies.delete('sessionid')
  },
})
