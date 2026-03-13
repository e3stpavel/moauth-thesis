import type { TokenEndpointAuth } from './auth'
import type { TokenEndpointBody } from './body'

export type Context = Readonly<{
  auth?: TokenEndpointAuth

  body: TokenEndpointBody

  signal: AbortSignal
}>
