import { Clients, db } from 'astro:db'
import * as hash from '~/utils/hash'

// https://astro.build/db/seed
export default async function seed() {
  const secret = '0123456789'
  const secretHash = await hash.digest(secret)

  await db.insert(Clients).values([
    {
      id: 'pub',
      name: 'Public client',
      redirectUris: ['http://localhost:4321/auth/callback'],
    },
    {
      id: 'conf',
      name: 'Confidential client',
      secretHash,
      redirectUris: ['http://localhost:4321/auth/callback'],
    },
  ])
}
