import { db, User } from 'astro:db'
import { randomCUID } from '~/utils/cuid'
import * as passwordHasher from '~/utils/password-hasher'

// https://astro.build/db/seed
export default async function seed() {
  const passwordHash = await passwordHasher.hash('Pass1234!')
  await db
    .insert(User)
    .values({
      id: randomCUID(),
      email: 'pamayo@taltech.ee',
      passwordHash,
    })
}
