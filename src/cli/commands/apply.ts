/**
 * File: src/cli/commands/apply.ts
 * Description: Apply command — runs SSH, Git, GPG, and hook setup from config
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { join } from 'node:path'
import type { Command } from 'commander'
import { resolveConfig } from '../../core/config.ts'
import type { AppConfig, AppOptions } from '../../core/types.ts'
import {
  configureGitGlobal,
  configureGitIgnore,
  installGitHooks,
} from '../../managers/git-manager.ts'
import { findGpgKey, setupGpg } from '../../managers/gpg-manager.ts'
import { setupSsh } from '../../managers/ssh-manager.ts'
import { logError, logInfo, logSuccess } from '../../utils/logger.ts'
import { checkDependencies } from '../helpers.ts'

/** Registers the apply subcommand. */
export function registerApplyCommand(program: Command): void {
  program
    .command('apply')
    .description('apply current configuration to system')
    .option('--ssh-only', 'only apply SSH configuration')
    .option('--git-only', 'only apply gitconfig, gitignore, and hooks')
    .option('--gpg-only', 'only apply GPG signing configuration')
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals()
      await runApply(globalOpts, opts)
    })
}

/** Executes the apply flow. */
async function runApply(
  globalOpts: Record<string, unknown>,
  localOpts: Record<string, unknown> = {},
): Promise<void> {
  const config = await resolveConfig()
  if (!config) {
    logError('No configuration found. Run `git-setup init` first.')
    process.exit(1)
  }

  const options = buildAppOptions(globalOpts)

  if (options.dryRun) {
    logInfo('Running in DRY-RUN mode — no changes will be made')
  }

  const requiredDeps = ['git', 'ssh-keygen']
  if (config.enableGpgSigning) {
    requiredDeps.push(config.gpgProgram)
  }
  await checkDependencies(requiredDeps)

  const sshOnly = Boolean(localOpts.sshOnly)
  const gitOnly = Boolean(localOpts.gitOnly)
  const gpgOnly = Boolean(localOpts.gpgOnly)
  const runAll = !sshOnly && !gitOnly && !gpgOnly

  if (runAll || sshOnly) {
    await setupSsh(config, options)
  }

  if (runAll || gitOnly) {
    await configureGitGlobal(config, options)
    await configureGitIgnore(options)
  }

  if (runAll || gpgOnly) {
    await setupGpg(config, options)
  }

  if (runAll || gitOnly) {
    await installGitHooks(config, options, buildGpgKeyFinder(config))
  }

  logSuccess('Configuration applied!')
}

/** Applies config with already-resolved AppConfig (used by init after wizard). */
export async function applyConfig(
  config: AppConfig,
  options: AppOptions,
): Promise<void> {
  if (options.dryRun) {
    logInfo('Running in DRY-RUN mode — no changes will be made')
  }

  const requiredDeps = ['git', 'ssh-keygen']
  if (config.enableGpgSigning) {
    requiredDeps.push(config.gpgProgram)
  }
  await checkDependencies(requiredDeps)

  await setupSsh(config, options)
  await configureGitGlobal(config, options)
  await configureGitIgnore(options)
  await setupGpg(config, options)
  await installGitHooks(config, options, buildGpgKeyFinder(config))

  logSuccess('Configuration applied!')
}

/** Builds AppOptions from Commander global options. */
export function buildAppOptions(
  globalOpts: Record<string, unknown>,
): AppOptions {
  return {
    dryRun: Boolean(globalOpts.dryRun),
    assumeYes: Boolean(globalOpts.yes),
    verbose: Boolean(globalOpts.verbose),
    sshDir: join(process.env.HOME ?? '', '.ssh'),
  }
}

/** Creates GPG key finder function from config. */
function buildGpgKeyFinder(config: AppConfig) {
  return config.enableGpgSigning
    ? (email: string) => findGpgKey(email, config.gpgProgram)
    : async () => null
}
