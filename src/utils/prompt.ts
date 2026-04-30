/**
 * File: src/utils/prompt.ts
 * Description: Interactive prompts via @clack/prompts
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as p from '@clack/prompts'

/** Asks the user for Y/n confirmation. Returns true if accepted. */
export async function confirmAction(
  message: string,
  assumeYes: boolean,
): Promise<boolean> {
  if (assumeYes) return true

  const result = await p.confirm({ message })
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.')
    process.exit(0)
  }
  return result
}

/** Asks the user for a text input. */
export async function textInput(
  message: string,
  options?: {
    placeholder?: string
    defaultValue?: string
    validate?: (value: string) => string | undefined
  },
): Promise<string> {
  const validate = options?.validate
  const result = await p.text({
    message,
    placeholder: options?.placeholder,
    defaultValue: options?.defaultValue,
    /* v8 ignore start */
    validate: validate
      ? (v: string | undefined) => validate(v ?? '')
      : undefined,
    /* v8 ignore stop */
  })
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.')
    process.exit(0)
  }
  return result
}

/** Asks the user to select one option from a list. */
export async function selectOption(
  message: string,
  options: { value: string; label?: string; hint?: string }[],
): Promise<string> {
  const result = await p.select({ message, options })
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.')
    process.exit(0)
  }
  return result
}
