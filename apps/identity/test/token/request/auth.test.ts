import { expect, it } from 'vitest'
import { InvalidClientError } from '~/core/oauth/token/error'
import { TokenEndpointAuth } from '~/core/oauth/token/request'

it.for([
  ['', 'empty'],
  ['cHViOjAxMjM0NTY3ODk=', 'without scheme'],
  ['Bearer cHViOjAxMjM0NTY3ODk=', 'invalid scheme'],
  ['   Basic     cHViOjAxMjM0NTY3ODk=', 'extra whitespaces'],
  ['Basic not-base64!!!', 'not base64'],
  ['Basic cHVi', 'not credentials'],
  ['Basic cHViOg==', 'only username'],
  ['Basic OjAxMjM0NTY3ODk=', 'only password'],
  ['Basic cHViOjAxMjM0NTY3ODk6cmVhbG0=', 'extra colon'],
  ['Basic cHVi8J+agDowMTIzNDU2Nzg5', 'not utf-8'],
  ['Basic cHViOjA9MTImMz00NTY3ODk=', 'not application-x-www-form-urlencoded'],
  ['Basic cHViOjAxMjM', 'truncated'],
  ['Basic cHUhYjoxMjM0NTY3ODk=', 'it break cli because of !'],
])('rejects invalid ($1)', ([authorization]) => {
  expect(() => new TokenEndpointAuth(authorization!)).toThrow(InvalidClientError)
})

it('accepts valid', () => {
  const auth = new TokenEndpointAuth('Basic cHViOjAxMjM0NTY3ODk=')

  expect(auth.clientId).toBe('pub')
  expect(auth.clientSecret).toBe('0123456789')
})
