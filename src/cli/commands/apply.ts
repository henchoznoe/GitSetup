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
import { findGpgKey, prepareGpgKeys } from '../../managers/gpg-manager.ts'
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

  const summary: string[] = []

  if (runAll || sshOnly) {
    summary.push(await setupSsh(config, options))
  }

  let gpgPrimaryKey: string | null = null
  if (runAll || gpgOnly || gitOnly) {
    const gpg = await prepareGpgKeys(config, options)
    gpgPrimaryKey = gpg.primaryKeyId
    if (runAll || gpgOnly) summary.push(gpg.summary)
  }

  if (runAll || gitOnly || gpgOnly) {
    summary.push(await configureGitGlobal(config, options, { gpgPrimaryKey }))
  }

  if (runAll || gitOnly) {
    summary.push(await configureGitIgnore(options))
    summary.push(
      await installGitHooks(config, options, buildGpgKeyFinder(config)),
    )
  }

  printSummary(summary)
}

/** Applies config with already-resolved AppConfig (used by init and profile commands). */
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

  const summary: string[] = []

  summary.push(await setupSsh(config, options))
  const gpg = await prepareGpgKeys(config, options)
  summary.push(gpg.summary)
  summary.push(
    await configureGitGlobal(config, options, {
      gpgPrimaryKey: gpg.primaryKeyId,
    }),
  )
  summary.push(await configureGitIgnore(options))
  summary.push(
    await installGitHooks(config, options, buildGpgKeyFinder(config)),
  )

  printSummary(summary)
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

/** Prints the final apply summary. */
function printSummary(summary: string[]): void {
  process.stdout.write('\n')
  logSuccess('\u{1F389} Done! Summary:')
  for (const line of summary) {
    process.stdout.write(`  • ${line}\n`)
  }
}

/** Creates GPG key finder function from config. */
function buildGpgKeyFinder(config: AppConfig) {
  return config.enableGpgSigning
    ? (email: string) => findGpgKey(email, config.gpgProgram)
    : async () => null
}
