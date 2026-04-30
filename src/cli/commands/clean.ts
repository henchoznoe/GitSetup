/**
 * File: src/cli/commands/clean.ts
 * Description: Clean command — removes all GitSetup-generated artifacts
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import type { Command } from 'commander'
import { resolveConfig } from '../../core/config.ts'
import { runCleaner } from '../../managers/cleaner.ts'
import { logError, logInfo } from '../../utils/logger.ts'
import { buildAppOptions } from './apply.ts'

/** Registers the clean subcommand. */
export function registerCleanCommand(program: Command): void {
  program
    .command('clean')
    .description('remove all GitSetup-generated artifacts')
    .option('--force', 'skip confirmation')
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals()
      await runClean(globalOpts, opts)
    })
}

/** Executes the clean flow. */
async function runClean(
  globalOpts: Record<string, unknown>,
  localOpts: Record<string, unknown>,
): Promise<void> {
  const config = await resolveConfig()
  if (!config) {
    logError('No configuration found. Nothing to clean.')
    return
  }

  const options = buildAppOptions(globalOpts)
  const optionsWithForce = {
    ...options,
    assumeYes: options.assumeYes || Boolean(localOpts.force),
  }

  if (options.dryRun) {
    logInfo('Running in DRY-RUN mode — no changes will be made')
  }

  await runCleaner(config, optionsWithForce)
}
