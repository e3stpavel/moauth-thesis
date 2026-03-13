export function splitN(str: string, separator: string, n: number): string[] {
  const parts = str.split(separator)

  const first = parts.slice(0, n - 1)
  const last = parts.slice(n - 1).join(separator)

  return [...first, last, ...Array.from<string>({ length: n - first.length - 1 }).fill('')]
}
