import { z } from 'astro/zod'

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(), // TODO: proper validation based on format
})
