#!/usr/bin/env tsx
/**
 * File: src/bin/git-setup.ts
 * Description: CLI entry point for GitSetup — parses flags and orchestrates modules
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../core/config.ts'
import type { AppOptions } from '../core/types.ts'
import { runCleaner } from '../managers/cleaner.ts'
import {
  configureGitGlobal,
  configureGitIgnore,
  installGitHooks,
} from '../managers/git-manager.ts'
import { findGpgKey, setupGpg } from '../managers/gpg-manager.ts'
import { setupSsh } from '../managers/ssh-manager.ts'
import { pathExists } from '../utils/file-ops.ts'
import { logError, logInfo, logSuccess } from '../utils/logger.ts'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(CURRENT_DIR, '../..')

/** Parses CLI arguments into AppOptions. */
function parseArgs(argv: string[]): AppOptions {
  const args = argv.slice(2)
  let dryRun = false
  let cleanMode = false
  let assumeYes = false

  for (const arg of args) {
    switch (arg) {
      case '-d':
      case '--dry-run':
        dryRun = true
        break
      case '--clean':
        cleanMode = true
        break
      case '-y':
      case '--yes':
        assumeYes = true
        break
      default:
        logError(`Unknown option: ${arg}`)
        process.stdout.write('\nUsage: git-setup [OPTIONS]\n\n')
        process.stdout.write('Options:\n')
        process.stdout.write(
          '  -d, --dry-run   Simulate without making changes\n',
        )
        process.stdout.write('  -y, --yes       Skip confirmation prompts\n')
        process.stdout.write(
          '  --clean         Remove all GitSetup-generated configurations\n',
        )
        process.exit(1)
    }
  }

  const sshDir = join(process.env.HOME ?? '', '.ssh')

  return { dryRun, cleanMode, assumeYes, sshDir, projectRoot: PROJECT_ROOT }
}

/** Checks that required system commands are available. */
async function checkDependencies(
  commands: string[],
  _dryRun: boolean,
): Promise<void> {
  for (const cmd of commands) {
    try {
      const { execFile } = await import('node:child_process')
      const { promisify } = await import('node:util')
      const execFileAsync = promisify(execFile)
      await execFileAsync('which', [cmd])
    } catch {
      logError(`Required dependency not found: ${cmd}`)
      process.exit(1)
    }
  }
}

/** Main execution flow. */
async function main(): Promise<void> {
  if (process.platform !== 'darwin') {
    logError('GitSetup is only supported on macOS')
    process.exit(1)
  }

  const options = parseArgs(process.argv)

  if (options.dryRun) {
    logInfo('Running in DRY-RUN mode — no changes will be made')
  }

  const envFilePath =
    process.env.GITSETUP_ENV_FILE ?? join(PROJECT_ROOT, '.env')

  if (!(await pathExists(envFilePath))) {
    logError(`Environment file not found: ${envFilePath}`)
    logError('Copy .env.example to .env and configure it')
    process.exit(1)
  }

  const config = await loadConfig(envFilePath)

  if (options.cleanMode) {
    await runCleaner(config, options)
    return
  }

  const requiredDeps = ['git', 'ssh-keygen']
  if (config.enableGpgSigning) {
    requiredDeps.push(config.gpgProgram)
  }
  await checkDependencies(requiredDeps, options.dryRun)

  await setupSsh(config, options)
  await configureGitGlobal(config, options)
  await configureGitIgnore(options)
  await setupGpg(config, options)

  const gpgKeyFinder = config.enableGpgSigning
    ? (email: string) => findGpgKey(email, config.gpgProgram)
    : async () => null

  await installGitHooks(config, options, gpgKeyFinder)

  logSuccess('GitSetup complete!')
}

main().catch(error => {
  logError(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
