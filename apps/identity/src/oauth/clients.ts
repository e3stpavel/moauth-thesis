import * as hasher from '~/utils/hasher'

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
    secretHash: '5727dc0e8b3b4b88f08f23a95cfdebfb59a2bb2d3132e1822d1e1c78720bacc2',
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

/**
 * Authenticated confidential client with client_id and client_secret,
 * it will reject public clients, because they cannot maintain confidentiality of their credentials
 */
export async function authenticate(clientId: string, secret: string): Promise<Client | null> {
  const client = await get(clientId)
  if (!client) {
    return null
  }

  if (!client.secretHash) {
    return null
  }

  const isSecretValid = await hasher.verify(client.secretHash, secret)
  if (!isSecretValid) {
    return null
  }

  return client
}

/** Identifies public client by client_id, it will reject confidential clients */
export async function identity(clientId: string): Promise<Client | null> {
  const client = await get(clientId)
  if (!client) {
    return null
  }

  if (client.secretHash) {
    return null
  }

  return client
}
