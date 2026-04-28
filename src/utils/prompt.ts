/**
 * File: src/utils/prompt.ts
 * Description: User confirmation prompts via readline/promises
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { createInterface } from 'node:readline/promises'

/** Asks the user for Y/n confirmation. Returns true if accepted. */
export async function confirmAction(
  message: string,
  assumeYes: boolean,
): Promise<boolean> {
  if (assumeYes) return true

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const answer = await rl.question(`[?] ${message} (y/N) `)
    return answer.trim().toLowerCase() === 'y'
  } finally {
    rl.close()
  }
}
