import { describe, expect, it } from 'vitest'
import { InvalidRequestError } from '~/core/oauth/token/error'
import { TokenEndpointBody } from '~/core/oauth/token/request'

it('parses body', () => {
  const params = new URLSearchParams()
  params.set('grant_type', 'test')
  params.set('client_id', 'test')

  const formUrlEncodedBody = params.toString()
  const body = new TokenEndpointBody(formUrlEncodedBody)

  expect(body.get('grant_type')).toBe('test')
  expect(body.get('client_id')).toBe('test')
})

it('ignores empty params', () => {
  const params = new URLSearchParams()
  params.set('grant_type', '')
  params.set('client_id', 'test')

  const formUrlEncodedBody = params.toString()
  const body = new TokenEndpointBody(formUrlEncodedBody)

  expect(body.get('grant_type')).toBeUndefined()
  expect(body.get('client_id')).toBe('test')
})

it('ignores unknown params', () => {
  const params = new URLSearchParams()
  params.set('grant_type', 'test')
  params.set('unknown_param', 'test')

  const formUrlEncodedBody = params.toString()
  const body = new TokenEndpointBody(formUrlEncodedBody)

  expect(body.get('grant_type')).toBe('test')
  expect(body.get('unknown_param')).toBeUndefined()
})

it('throws on duplicate params', () => {
  const params = new URLSearchParams()
  params.append('grant_type', 'test')
  params.append('grant_type', 'test_test')

  const formUrlEncodedBody = params.toString()
  expect(() => new TokenEndpointBody(formUrlEncodedBody)).toThrowError(InvalidRequestError)
})

it('throws on invalid param', () => {
  const params = new URLSearchParams()
  params.set('client_id', '__test') // cuid2 doesn't contain underscore

  const formUrlEncodedBody = params.toString()
  expect(() => new TokenEndpointBody(formUrlEncodedBody)).toThrowError(InvalidRequestError)
})

describe('get', () => {
  it('returns value when param exists', () => {
    const params = new URLSearchParams()
    params.set('grant_type', 'test')

    const formUrlEncodedBody = params.toString()
    const body = new TokenEndpointBody(formUrlEncodedBody)

    expect(body.get('grant_type')).toBe('test')
  })

  it('returns \'undefined\' when param doesn\'t exist', () => {
    const body = new TokenEndpointBody('')

    expect(body.get('grant_type')).toBeUndefined()
  })
})

describe('has', () => {
  it('returns \'true\' when param exists', () => {
    const params = new URLSearchParams()
    params.set('grant_type', 'test')

    const formUrlEncodedBody = params.toString()
    const body = new TokenEndpointBody(formUrlEncodedBody)

    expect(body.has('grant_type')).toBeTruthy()
  })

  it('returns \'false\' when param doesn\'t exist', () => {
    const body = new TokenEndpointBody('')

    expect(body.has('grant_type')).toBeFalsy()
  })
})
