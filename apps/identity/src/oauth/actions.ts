import { ActionError, defineAction } from 'astro:actions'
import * as authorizationCodes from './authorization-codes'
import * as consents from './consents'
import { consentResponseSchema } from './models'

export const consent = defineAction({
  input: consentResponseSchema,
  accept: 'form',
  handler: async (consentResponse, context) => {
    const consentRequest = await consents.pull(consentResponse['request_id'])
    if (!consentRequest) {
      throw new ActionError({ code: 'BAD_REQUEST' })
    }

    const session = context.locals.session
    if (!session) {
      throw new ActionError({ code: 'FORBIDDEN' })
    }

    const redirectUrl = consentRequest.redirectUrl
    redirectUrl.searchParams.set('state', consentRequest.state)

    if (consentResponse.approved) {
      // TODO: save user consent to avoid asking them later

      const code = await authorizationCodes.create({
        userId: session.user.id,
        ...consentRequest,
      })
      redirectUrl.searchParams.set('code', code.token)
    }
    else {
      redirectUrl.searchParams.set('error', 'access_denied')
    }

    redirectUrl.searchParams.sort()
    return redirectUrl.href
  },
})
