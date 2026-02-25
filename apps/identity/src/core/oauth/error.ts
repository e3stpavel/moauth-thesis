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

  constructor(message?: string, reference?: string) {
    super(message, reference)
  }

  static fromValidationIssues(issues: ValidationIssue[]) {
    if (issues.length > 0) {
      const { message, path } = issues.at(0)!
      return new this(`${message}${path.length > 0 ? ` (${path.join('.')})` : ''}`)
    }

    return new this('Validation failed')
  }
}

export class InvalidClientError extends TokenError {
  code = 'invalid_client'

  constructor(message?: string, reference?: string) {
    super(message, reference)
  }
}

export class UnsupportedGrantTypeError extends TokenError {
  code = 'unsupported_grant_type'

  constructor(message?: string, reference?: string) {
    super(message, reference)
  }
}
