import { Clients, db } from 'astro:db'

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(Clients).values([
    {
      id: 'pub',
      name: 'Public client',
      redirectUris: ['http://localhost:4321/auth/callback'],
    },
  ])
}
