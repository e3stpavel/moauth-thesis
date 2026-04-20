import * as base32 from './base32'
import * as base64 from './base64'
import * as base64url from './base64url'
import * as formUrlEncoded from './form-urlencoded'

import * as hexLowercase from './hex/lowercase'
import * as hexUppercase from './hex/uppercase'

const hex = {
  lowercase: hexLowercase,
  uppercase: hexUppercase,
}

export {
  base32,
  base64,
  base64url,
  formUrlEncoded,
  hex,
}

export default {
  base64,
  base64url,
  formUrlEncoded,
  hex,
}
