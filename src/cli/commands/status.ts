/**
 * File: src/cli/commands/status.ts
 * Description: Status command — shows what GitSetup has configured on disk
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { join } from 'node:path'
import type { Command } from 'commander'
import { configExists, loadJsonConfig } from '../../core/config.ts'
import {
  GIT_TEMPLATE_DIR,
  GITCONFIG_DEST,
  GITIGNORE_DEST,
  HOOKS_DIR,
  SSH_KEY_TYPE,
} from '../../core/constants.ts'
import { homePath, pathExists } from '../../utils/file-ops.ts'
import { logError, logInfo } from '../../utils/logger.ts'
import { sanitizeHost } from '../../utils/sanitize.ts'

/** Registers the status subcommand. */
export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('show what is currently configured on disk')
    .action(async () => {
      await runStatus()
    })
}

/** Displays current installation status. */
async function runStatus(): Promise<void> {
  if (!(await configExists())) {
    logError('No configuration found. Run `git-setup init` first.')
    return
  }

  const config = await loadJsonConfig()
  const sshDir = join(process.env.HOME ?? '', '.ssh')

  logInfo('GitSetup status:\n')

  const gitconfigExists = await pathExists(homePath(GITCONFIG_DEST))
  printStatus('~/.gitconfig', gitconfigExists)

  const gitignoreExists = await pathExists(homePath(GITIGNORE_DEST))
  printStatus('~/.gitignore_global', gitignoreExists)

  const hooksDir = homePath(GIT_TEMPLATE_DIR, HOOKS_DIR)
  const hooksExist = await pathExists(join(hooksDir, 'post-checkout'))
  printStatus('Git hooks (template)', hooksExist)

  process.stdout.write('\n')
  logInfo('SSH keys:')
  for (const profile of config.profiles) {
    const keyName = `id_${SSH_KEY_TYPE}_${sanitizeHost(profile.host)}`
    const keyPath = join(sshDir, keyName)
    const exists = await pathExists(keyPath)
    printStatus(`  ${profile.host} (${keyName})`, exists)
  }
}

/** Prints a status line with checkmark or cross. */
function printStatus(label: string, exists: boolean): void {
  const icon = exists ? '✓' : '✗'
  const status = exists ? 'installed' : 'missing'
  process.stdout.write(`  ${icon} ${label} — ${status}\n`)
}
