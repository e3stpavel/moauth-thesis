import { login, logout } from '~/auth/actions'
import { consent } from '~/oauth/actions'

export const server = {
  auth: {
    login,
    logout,
  },
  oauth: {
    consent,
  },
}
