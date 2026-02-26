export interface Body {
  get: (name: string) => string | undefined

  has: (name: string) => boolean
}

export interface Context {
  readonly body: Body

  readonly headers: Headers

  // TODO: this is container to inject not only request locals
  readonly locals: App.Locals
}
