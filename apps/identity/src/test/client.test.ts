import { describe, expect, it } from 'vitest'
import { Client } from '~/core/oauth/client'

describe('isPublic', () => {
  it('returns true when no secret', () => {
    const client = new Client('test', 'test', [])

    expect(client.isPublic).toBeTruthy()
  })

  it('returns false when secret', () => {
    const client = new Client('test', 'test', [], 'secret')

    expect(client.isPublic).toBeFalsy()
  })
})

describe('isConfidential', () => {
  it('returns false when no secret', () => {
    const client = new Client('test', 'test', [])

    expect(client.isConfidential).toBeFalsy()
  })

  it('returns true when secret', () => {
    const client = new Client('test', 'test', [], 'secret')

    expect(client.isConfidential).toBeTruthy()
  })
})

describe('verifySecret', async () => {
  it('works when secret', () => {
    const client = new Client('test', 'test', [], 'secret')

    const result = client.verifySecret('secret', () => true)

    expect(result).toBeTruthy()
  })

  it('throws when no secret', () => {
    const client = new Client('test', 'test', [])

    expect(client.verifySecret('secret', () => true)).rejects.toThrow('Public client cannot hold a secret')
  })
})
