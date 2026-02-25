import { z } from 'astro/zod'

export const clientCredentialsSchema = z.object({
  clientId: z.string().cuid2(),
  clientSecret: z.string().regex(/^[0-9a-f]+$/),
})

export type ClientCredentials = z.infer<typeof clientCredentialsSchema>
