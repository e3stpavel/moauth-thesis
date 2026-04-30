import type { z } from 'astro/zod'

/** Represents validation status as first element, second element is data, third is error message */
type ValidationResult<TSchema extends z.ZodTypeAny> = [true, z.infer<TSchema>, undefined] | [false, undefined, string]

export function validate<TSchema extends z.AnyZodObject>(
  form: URLSearchParams,
  schema: TSchema,
): ValidationResult<TSchema> {
  const names: string[] = schema.keyof().options
  const acc: { [key: string]: unknown } = {}
  for (const name of names) {
    const parameterSchema = schema.shape[name]
    const [valid, data, error] = validateOne(name, form, parameterSchema)
    if (!valid) {
      return [false, undefined, error]
    }

    acc[name] = data
  }

  return [true, acc, undefined]
}

export function validateOne<TSchema extends z.ZodTypeAny>(
  name: string,
  form: URLSearchParams,
  schema: TSchema,
): ValidationResult<TSchema> {
  const values = form.getAll(name)
  // Request and response parameters MUST NOT be included more than once
  if (values.length > 1) {
    return [false, undefined, `${name} must not be included more than once`]
  }

  // Parameters sent without a value MUST be treated as if they were omitted from the request
  const value = values.filter(value => !!value.trim()).at(0)
  const validation = schema.safeParse(value)
  if (!validation.success) {
    // showing real validation error might disclose technical details, so for now we show vague message
    // const issue = validation.error.issues.at(0)
    // const message = issue ? `${issue.message} (${[parameter, ...issue.path].join('.')})` : 'Invalid request'
    return [false, undefined, `Invalid or required ${name}`]
  }

  return [true, validation.data, undefined]
}

export function validateMany<TSchema extends z.ZodTypeAny>(
  name: string,
  form: URLSearchParams,
  schema: TSchema,
): ValidationResult<TSchema> {
  // Parameters sent without a value MUST be treated as if they were omitted from the request
  const values = form.getAll(name).filter(value => !!value.trim())
  const acc = []
  for (const value of values) {
    const validation = schema.safeParse(value)
    if (!validation.success) {
      // showing real validation error might disclose technical details, so for now we show vague message
      return [false, undefined, `Invalid ${name}`]
    }
    acc.push(validation.data)
  }

  return [true, acc, undefined]
}
