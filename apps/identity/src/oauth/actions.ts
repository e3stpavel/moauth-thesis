import { ActionError, defineAction } from 'astro:actions'
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

    const redirectUrl = new URL(consentRequest.redirectUrl)
    if (consentResponse.approved) {
      // TODO: save user consent to avoid asking them later

      // TODO: store code, 1 min exp, single use, detect reuse,
      //  bound to the client identifier and redirection URI
      const code = 'code1234'
      redirectUrl.searchParams.set('code', code)
    }
    else {
      redirectUrl.searchParams.set('error', 'access_denied')
    }

    redirectUrl.searchParams.sort()
    return redirectUrl.href
  },
})
