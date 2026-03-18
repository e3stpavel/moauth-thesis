/**
 * Tagged template to format generated code
 */
export function code(strings: TemplateStringsArray, ...values: string[]): string {
  const raw = String.raw({ raw: strings }, ...values)

  const lines = raw.split('\n')
  const firstLineIndex = lines.findIndex(line => line.trim() !== '')
  const [spaces] = lines[firstLineIndex]!.split(lines[firstLineIndex]!.trim())

  return lines
    .map(line => line.replace(spaces!, ''))
    .join('\n')
    .trim()
}
