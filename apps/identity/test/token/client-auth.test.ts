import type { Context } from '~/core/oauth/token/request'
import { describe, expect, it } from 'vitest'
import * as clientAuth from '~/core/oauth/token/client-auth'
import { InvalidClientError, InvalidRequestError } from '~/core/oauth/token/error'
import { TokenEndpointAuth, TokenEndpointBody } from '~/core/oauth/token/request'

describe('validateRequest', () => {
  describe('client_secret_basic', () => {
    it('selects', () => {
      const controller = new AbortController()
      const context: Context = {
        auth: new TokenEndpointAuth('Basic cHViOjAxMjM0NTY3ODk='),
        body: new TokenEndpointBody(''),
        signal: controller.signal,
      }

      const clientAuthRequest = clientAuth.validateRequest(context)

      expect(clientAuthRequest).toStrictEqual({
        method: 'client_secret_basic',
        clientId: 'pub',
        clientSecret: '0123456789',
      })
    })

    it('rejects when \'client_id\' in body doesn\'t match', () => {
      const controller = new AbortController()
      const context: Context = {
        auth: new TokenEndpointAuth('Basic cHViOjAxMjM0NTY3ODk='),
        body: new TokenEndpointBody('client_id=conf'),
        signal: controller.signal,
      }

      expect(() => clientAuth.validateRequest(context)).toThrow(InvalidClientError)
    })

    it('ignores \'client_id\' if it matches', () => {
      const controller = new AbortController()
      const context: Context = {
        auth: new TokenEndpointAuth('Basic cHViOjAxMjM0NTY3ODk='),
        body: new TokenEndpointBody('client_id=pub'),
        signal: controller.signal,
      }

      const clientAuthRequest = clientAuth.validateRequest(context)

      expect(clientAuthRequest).toStrictEqual({
        method: 'client_secret_basic',
        clientId: 'pub',
        clientSecret: '0123456789',
      })
    })
  })

  describe('client_secret_post', () => {
    it('selects', () => {
      const controller = new AbortController()
      const context: Context = {
        body: new TokenEndpointBody('client_id=pub&client_secret=0123456789'),
        signal: controller.signal,
      }

      const clientAuthRequest = clientAuth.validateRequest(context)

      expect(clientAuthRequest).toStrictEqual({
        method: 'client_secret_post',
        clientId: 'pub',
        clientSecret: '0123456789',
      })
    })

    it('rejects when \'client_id\' missing', () => {
      const controller = new AbortController()
      const context: Context = {
        body: new TokenEndpointBody('client_secret=0123456789'),
        signal: controller.signal,
      }

      expect(() => clientAuth.validateRequest(context)).toThrow(InvalidClientError)
    })
  })

  it('selects \'none\'', () => {
    const controller = new AbortController()
    const context: Context = {
      body: new TokenEndpointBody('client_id=pub'),
      signal: controller.signal,
    }

    const clientAuthRequest = clientAuth.validateRequest(context)

    expect(clientAuthRequest).toStrictEqual({
      method: 'none',
      clientId: 'pub',
    })
  })

  it('rejects when no authentication method used', () => {
    const controller = new AbortController()
    const context: Context = {
      body: new TokenEndpointBody(''),
      signal: controller.signal,
    }

    expect(() => clientAuth.validateRequest(context)).toThrow(InvalidClientError)
  })

  it('rejects when more than one authentication method used', () => {
    const controller = new AbortController()
    const context: Context = {
      auth: new TokenEndpointAuth('Basic cHViOjAxMjM0NTY3ODk='),
      body: new TokenEndpointBody('client_id=pub&client_secret=0123456789'),
      signal: controller.signal,
    }

    expect(() => clientAuth.validateRequest(context)).toThrow(InvalidRequestError)
  })
})
