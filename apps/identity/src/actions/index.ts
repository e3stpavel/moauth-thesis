import { z } from 'astro/zod'
import { ActionError, defineAction } from 'astro:actions'
import { login, logout } from '~/auth/actions'

export const server = {
  auth: {
    login,
    logout,
  },
  oauth: {
    consent: defineAction({
      accept: 'form',
      input: z.object({
        approved: z.coerce.boolean(),
      }),
      handler: async ({ approved }) => {
        const url = new URL('http://localhost:3211/cb')
        url.searchParams.set('state', 'test1234')

        if (!approved) {
          url.searchParams.set('error', 'access_denied')
        }
        else {
          url.searchParams.set('code', 'code1234')
        }

        url.searchParams.sort()
        return url
      },
    }),
  },
}
