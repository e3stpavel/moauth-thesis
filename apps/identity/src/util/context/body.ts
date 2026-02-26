import type { Body } from '~/core/oauth/context'
import { InvalidRequestError } from '~/core/oauth/error'

export class FormUrlEncodedBody implements Body {
  constructor(private readonly formData: FormData) {
  }

  get(name: string): string | undefined {
    const values = this.formData.getAll(name)
    if (values.some(field => field instanceof File)) {
      throw new TypeError('\'application/x-www-form-urlencoded\' form field cannot contain \'File\'')
    }

    // Parameters sent without a value MUST be treated as if they were omitted from the request
    //  https://datatracker.ietf.org/doc/html/rfc6749#section-3.2
    const fields = (values as string[])
      .map(field => field.trim() ? field : undefined)
      .filter((field): field is string => !!field)

    if (fields.length > 1) {
      // Request and response parameters MUST NOT be included more than once
      //  https://datatracker.ietf.org/doc/html/rfc6749#section-3.2
      throw new InvalidRequestError(`Parameter '${name}' is included more than once`)
    }

    return fields.at(0)
  }

  // it differs from browser spec that returns true if key exists
  //  https://xhr.spec.whatwg.org/#dom-formdata-has
  has(name: string): boolean {
    return !!this.get(name)
  }
}
