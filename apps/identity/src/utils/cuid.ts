import * as cuid2 from '@paralleldrive/cuid2'

export function randomCUID() {
  return cuid2.createId()
}
