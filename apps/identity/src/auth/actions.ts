import { ActionError, defineAction } from 'astro:actions'
import { db, eq, User } from 'astro:db'
import { randomCUID } from '~/utils/cuid'
import * as passwordHasher from '~/utils/password-hasher'
import { credentialsSchema, registrationSchema } from './models'
import * as sessions from './sessions'

export const register = defineAction({
  input: registrationSchema,
  accept: 'form',
  handler: async (credentials, context) => {
    // user cannot register if he is already logged in,
    //  for now we don't support multiple accounts switching
    if (context.locals.session) {
      throw new ActionError({ code: 'FORBIDDEN' })
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

    const session = await sessions.start(user.id)
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
    // now hitting it directly will return 403, hitting it through login form, will silently log you in
    //  UX question, idk how to handle this better at the moment
    if (context.locals.session) {
      throw new ActionError({ code: 'FORBIDDEN' })
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

    const session = await sessions.start(user.id)
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
      return
    }

    await sessions.invalidate(session.id)
    context.cookies.delete('sessionid')
  },
})
