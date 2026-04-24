import { db, User } from 'astro:db'
import passwordHasher from '~/auth/password-hasher'
import { randomCUID } from '~/utils/cuid'

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
