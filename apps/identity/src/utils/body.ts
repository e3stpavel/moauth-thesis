type Result<T> = [true, T] | [false, undefined]

/**
 * Read the request body as a `Uint8Array`, enforcing a maximum size limit.
 * Checks the `Content-Length` header for early rejection, then streams the body
 * and tracks bytes received.
 *
 * @link https://github.com/withastro/astro/blob/main/packages/astro/src/core/request-body.ts
 */
export async function readBodyWithLimit(request: Request, limit: number): Promise<Result<Uint8Array>> {
  const contentLengthHeader = request.headers.get('content-length')
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10)
    if (Number.isFinite(contentLength) && contentLength > limit) {
      return [false, undefined]
    }
  }

  if (!request.body)
    return [true, new Uint8Array()]

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    if (value) {
      received += value.byteLength
      if (received > limit) {
        return [false, undefined]
      }
      chunks.push(value)
    }
  }

  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return [true, bytes]
}
