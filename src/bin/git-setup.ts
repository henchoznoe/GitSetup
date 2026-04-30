/**
 * File: src/bin/git-setup.ts
 * Description: CLI entry point — macOS guard and Commander program bootstrap
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProgram } from '../cli/program.ts'
import { logError } from '../utils/logger.ts'

declare const __APP_VERSION__: string | undefined

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(CURRENT_DIR, '../..')

/** Returns the application version (injected at build time, fallback to package.json). */
function getVersion(): string {
  if (typeof __APP_VERSION__ !== 'undefined') {
    return __APP_VERSION__
  }
  const pkgPath = resolve(PROJECT_ROOT, 'package.json')
  return JSON.parse(readFileSync(pkgPath, 'utf-8')).version
}

if (process.platform !== 'darwin') {
  logError('GitSetup is only supported on macOS')
  process.exit(1)
}

const program = createProgram(getVersion())
program.parseAsync(process.argv).catch(error => {
  logError(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
