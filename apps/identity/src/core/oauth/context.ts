export interface Body {
  get: (name: string) => string | undefined

  has: (name: string) => boolean
}

export interface Context {
  readonly body: Body

  readonly headers: Headers

  readonly signal: AbortSignal
}
