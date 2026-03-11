import type { Body } from '~/core/oauth/context'
import { InvalidRequestError } from '~/core/oauth/error'

export class FormUrlEncodedBody implements Body {
  private readonly params: URLSearchParams

  constructor(encoded: string) {
    this.params = new URLSearchParams(encoded)
  }

  get(name: string): string | undefined {
    const values = this.params.getAll(name)

    // Parameters sent without a value MUST be treated as if they were omitted from the request
    //  https://datatracker.ietf.org/doc/html/rfc6749#section-3.2
    const result = values
      .map(value => value.trim() ? value : undefined)
      .filter((value): value is string => !!value)

    if (result.length > 1) {
      // Request and response parameters MUST NOT be included more than once
      //  https://datatracker.ietf.org/doc/html/rfc6749#section-3.2
      throw new InvalidRequestError(`Parameter '${name}' is included more than once`)
    }

    return result.at(0)
  }

  // it differs from browser spec that returns true if key exists
  //  https://xhr.spec.whatwg.org/#dom-formdata-has
  has(name: string): boolean {
    return !!this.get(name)
  }
}
