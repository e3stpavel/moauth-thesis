export abstract class TokenEndpointError extends Error {
  public abstract readonly code: string

  constructor(message?: string, public reference?: string) {
    super(message)
  }
}

interface ValidationIssue {
  message: string
  path: (string | number)[]
}

export class InvalidRequestError extends TokenEndpointError {
  code = 'invalid_request'

  constructor(
    message: string = 'The request is missing a required parameter, includes an unsupported parameter value (other than grant type), repeats a parameter or is otherwise malformed',
    reference?: string,
  ) {
    super(message, reference)
  }

  static withIssue(issue?: ValidationIssue) {
    if (issue) {
      const { message, path } = issue
      return new this(`${message}${path.length > 0 ? ` (${path.join('.')})` : ''}`)
    }

    return new this()
  }
}

export class InvalidClientError extends TokenEndpointError {
  code = 'invalid_client'

  constructor(
    message: string = 'Client authentication failed due to missing or invalid client credentials',
    reference?: string,
  ) {
    super(message, reference)
  }
}

export class UnsupportedGrantTypeError extends TokenEndpointError {
  code = 'unsupported_grant_type'

  constructor(
    message: string = 'The authorization grant type is not supported by the authorization server',
    reference?: string,
  ) {
    super(message, reference)
  }
}
