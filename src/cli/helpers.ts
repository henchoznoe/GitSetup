/**
 * File: src/cli/helpers.ts
 * Description: Shared CLI helper functions
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { logError } from '../utils/logger.ts'

const execFileAsync = promisify(execFile)

/** Verifies that required system commands are available in PATH. */
export async function checkDependencies(commands: string[]): Promise<void> {
  for (const cmd of commands) {
    try {
      await execFileAsync('which', [cmd])
    } catch {
      logError(`Required dependency not found: ${cmd}`)
      process.exit(1)
    }
  }
}
