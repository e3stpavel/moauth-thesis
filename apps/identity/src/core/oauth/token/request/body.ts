import { z } from 'astro/zod'
import { clientIdSchema, clientSecretSchema, redirectUriSchema } from '~/core/oauth/schema'
import { InvalidRequestError } from '~/core/oauth/token/error'

const tokenRequestSchema = z
  .object({
    grant_type: z.string(),

    client_id: clientIdSchema,
    client_secret: clientSecretSchema,

    code: z.string(),
    redirect_uri: redirectUriSchema,
    code_verifier: z.string(),

    refresh_token: z.string(),

    // scope: z.string()
  })
  .partial()

type TokenRequest = z.infer<typeof tokenRequestSchema>

type TokenRequestParam = keyof TokenRequest

export class TokenEndpointBody {
  private readonly params: TokenRequest

  constructor(formUrlEncodedBody: string) {
    const body = new URLSearchParams(formUrlEncodedBody)
    const params = body.entries()
      // Parameters sent without a value MUST be treated as if they were omitted from the request
      .filter(([_, value]) => !!value.trim())
      // The authorization server MUST ignore unrecognized request parameters
      .filter(([key]) => {
        const validation = tokenRequestSchema.keyof().safeParse(key)
        return validation.success
      })
      .reduce<Record<string, string>>((acc, [key, value]) => {
        if (key in acc) {
          // Request and response parameters MUST NOT be included more than once
          throw new InvalidRequestError(
            `Request parameters must not be included more than once (${key})`,
            'https://datatracker.ietf.org/doc/html/rfc6749#section-3.2',
          )
        }
        return { ...acc, [key]: value }
      }, {})

    const validation = tokenRequestSchema.safeParse(params)
    if (!validation.success) {
      throw InvalidRequestError.withIssue(
        validation.error.issues.at(0),
      )
    }

    this.params = validation.data
  }

  get(param: TokenRequestParam): string | undefined
  get(param: string): string | undefined
  get(param: string) {
    return this.params[param as TokenRequestParam]
  }

  has(param: TokenRequestParam): boolean
  has(param: string): boolean
  has(param: string) {
    return !!this.get(param)
  }
}
