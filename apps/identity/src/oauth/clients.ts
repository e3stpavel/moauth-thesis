export interface Client {
  id: string
  name: string
  secretHash: string | null
  redirectUris: string[]
  createdAt: Date
}

// currently we will store clients in code, later db can be introduced
const clients: Client[] = [
  {
    id: 'nnqq8p0utwlb37769z9xt0gc',
    name: 'Test Web Client',
    secretHash: 'b7cfb994e33f494d0d7adcc6823e87426b3de8816fc96887e9180519c1e3fcea',
    redirectUris: [
      'http://localhost:4321/auth/callback',
      'http://localhost:4321/auth/moauth/callback',
    ],
    createdAt: new Date(2026, 3, 16),
  },
  {
    id: 'h4j3hcjghjd9gfxycnyu7fum',
    name: 'Test SPA Client',
    secretHash: null,
    redirectUris: [
      'http://localhost:4321/oauth/callback',
    ],
    createdAt: new Date(2026, 3, 16),
  },
]

type MaybePromise<T> = T | Promise<T>

export function get(clientId: string): MaybePromise<Client | null> {
  const client = clients.find(client => client.id === clientId)
  return client ?? null
}

// export function authenticate()
