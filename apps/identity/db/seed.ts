import { Clients, db } from 'astro:db'

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(Clients).values([
    {
      id: 'pub',
      name: 'Public client',
      isPublic: true,
      redirectUris: ['http://localhost:4321/auth/callback'],
    },
  ])
}
