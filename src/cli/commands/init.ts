/**
 * File: src/cli/commands/init.ts
 * Description: Init command — interactive wizard for first-time configuration
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as p from '@clack/prompts'
import type { Command } from 'commander'
import {
  configExists,
  getConfigPath,
  getLegacyEnvPath,
  migrateFromEnv,
  saveConfig,
  toAppConfig,
} from '../../core/config.ts'
import { pathExists } from '../../utils/file-ops.ts'
import { logInfo, logSuccess } from '../../utils/logger.ts'
import { runWizard } from '../wizard.ts'
import { applyConfig, buildAppOptions } from './apply.ts'

/** Registers the init subcommand. */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('interactive first-time setup wizard')
    .option('--non-interactive', 'migrate from existing .env without prompts')
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals()
      await runInit(globalOpts, opts)
    })
}

/** Executes the init flow. */
async function runInit(
  globalOpts: Record<string, unknown>,
  localOpts: Record<string, unknown>,
): Promise<void> {
  if (await configExists()) {
    const overwrite = await p.confirm({
      message: 'Configuration already exists. Start fresh?',
      initialValue: false,
    })
    if (p.isCancel(overwrite) || !overwrite) {
      logInfo(
        'Cancelled. Use `git-setup apply` to re-apply or `git-setup config edit` to modify.',
      )
      return
    }
  }

  if (localOpts.nonInteractive) {
    await runNonInteractiveMigration(globalOpts)
    return
  }

  const jsonConfig = await runWizard()

  await saveConfig(jsonConfig)
  logSuccess(`Config saved to ${getConfigPath()}`)

  const shouldApply = await p.confirm({
    message: 'Apply configuration now?',
    initialValue: true,
  })
  if (p.isCancel(shouldApply) || !shouldApply) {
    logInfo('Run `git-setup apply` when ready.')
    return
  }

  const options = buildAppOptions(globalOpts)
  await applyConfig(toAppConfig(jsonConfig), options)
  p.outro('Done! Run `git-setup status` to verify.')
}

/** Migrates legacy .env to JSON config without prompts. */
async function runNonInteractiveMigration(
  globalOpts: Record<string, unknown>,
): Promise<void> {
  const legacyPath = getLegacyEnvPath()
  const envOverride = process.env.GITSETUP_ENV_FILE

  let envPath: string | null = null
  if (await pathExists(legacyPath)) {
    envPath = legacyPath
  } else if (envOverride && (await pathExists(envOverride))) {
    envPath = envOverride
  }

  if (!envPath) {
    logInfo(
      'No .env file found to migrate. Run `git-setup init` interactively.',
    )
    return
  }

  const jsonConfig = await migrateFromEnv(envPath)
  await saveConfig(jsonConfig)
  logSuccess(`Migrated ${envPath} → ${getConfigPath()}`)

  const options = buildAppOptions(globalOpts)
  await applyConfig(toAppConfig(jsonConfig), options)
}
