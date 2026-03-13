import { describe, expect, it } from 'vitest'
import * as strings from '~/utils/strings'

describe('splitN', () => {
  it('splits into two', () => {
    const result = strings.splitN('unit:test', ':', 2)

    expect(result).toStrictEqual(['unit', 'test'])
  })

  it('splits into four and pads with empty string', () => {
    const result = strings.splitN('unit:test', ':', 4)

    expect(result).toStrictEqual(['unit', 'test', '', ''])
  })

  it('splits into three joining the rest', () => {
    const result = strings.splitN('unit:test:of:split:n', ':', 3)

    expect(result).toStrictEqual(['unit', 'test', 'of:split:n'])
  })

  it('splits into one', () => {
    const result = strings.splitN('unit:test', ':', 1)

    expect(result).toStrictEqual(['unit:test'])
  })

  it('behaves like JS split when n is 0', () => {
    const str = 'unit:test:of:split:behaves:like:split'
    const result = strings.splitN(str, ':', 0)

    expect(result).toStrictEqual(str.split(':'))
  })
})
