/**
 * File: src/utils/logger.ts
 * Description: Colored console output using Node 22 util.styleText
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { styleText } from 'node:util'

/** Prints an informational message with a blue [INFO] prefix. */
export function logInfo(message: string): void {
  const tag = styleText('blue', '[INFO]')
  process.stdout.write(`${tag} ${message}\n`)
}

/** Prints a success message with a green [OK] prefix. */
export function logSuccess(message: string): void {
  const tag = styleText('green', '[OK]')
  process.stdout.write(`${tag} ${message}\n`)
}

/** Prints a warning message with a yellow [WARN] prefix. */
export function logWarning(message: string): void {
  const tag = styleText('yellow', '[WARN]')
  process.stdout.write(`${tag} ${message}\n`)
}

/** Prints an error message with a red [ERR] prefix to stderr. */
export function logError(message: string): void {
  const tag = styleText('red', '[ERR]')
  process.stderr.write(`${tag} ${message}\n`)
}
