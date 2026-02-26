export abstract class TokenError extends Error {
  abstract readonly code: string

  constructor(message?: string, public reference?: string) {
    super(message)
  }
}

interface ValidationIssue {
  message: string
  path: (string | number)[]
}

export class InvalidRequestError extends TokenError {
  code = 'invalid_request'

  constructor(
    message: string = 'The request is missing a required parameter, includes an unsupported parameter value (other than grant type), repeats a parameter or is otherwise malformed',
    reference?: string,
  ) {
    super(message, reference)
  }

  static fromValidationIssues(issues: ValidationIssue[]) {
    if (issues.length > 0) {
      const { message, path } = issues.at(0)!
      return new this(`${message}${path.length > 0 ? ` (${path.join('.')})` : ''}`)
    }

    return new this()
  }
}

export class InvalidClientError extends TokenError {
  code = 'invalid_client'

  constructor(
    message: string = 'Client authentication failed due to missing or invalid client credentials',
    reference?: string,
  ) {
    super(message, reference)
  }
}

export class UnsupportedGrantTypeError extends TokenError {
  code = 'unsupported_grant_type'

  constructor(
    message: string = 'The authorization grant type is not supported by the authorization server',
    reference?: string,
  ) {
    super(message, reference)
  }
}
