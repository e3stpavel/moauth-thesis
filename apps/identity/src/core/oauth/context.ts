// interface Bucket<T> {
//   get: (name: string) => T | null

//   getAll: (name: string) => T[]

//   has: (name: string) => boolean
// }

export interface Context {
  body: FormData

  headers: Headers

  locals: App.Locals
}
