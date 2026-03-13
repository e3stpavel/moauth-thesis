// ' %&+£€' => '+%25%26%2B%C2%A3%E2%82%AC'
//  https://datatracker.ietf.org/doc/html/rfc6749#appendix-B
export function validate(encoded: string): boolean {
  // as we parse "value" string, this chars must be encoded, otherwise they can break parsing
  if (encoded.includes('&') || encoded.includes('=')) {
    return false
  }
  return true
}

export function encode(data: string): string {
  const params = new URLSearchParams()
  params.append('q', data)
  return params.toString().slice('q='.length)
}

export function decode(encoded: string): string {
  const isEscaped = validate(encoded)
  if (!isEscaped) {
    throw new Error('Invalid character')
  }

  // even if some chars left unencoded, it will just pass them through
  const params = new URLSearchParams(`q=${encoded}`)
  return params.get('q')!
}
