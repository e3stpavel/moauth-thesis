import * as argon2 from '@node-rs/argon2'

const hashOptions = {
  memoryCost: 19 * 1024,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
}

export function hash(password: string, signal?: AbortSignal) {
  return argon2.hash(password, hashOptions, signal)
}

export function verify(hashed: string, password: string, signal?: AbortSignal) {
  return argon2.verify(hashed, password, hashOptions, signal)
}
