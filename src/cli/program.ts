/**
 * File: src/cli/program.ts
 * Description: Commander program factory with global options and subcommand registration
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { Command } from 'commander'
import { configExists } from '../core/config.ts'
import { logInfo } from '../utils/logger.ts'
import { registerAliasesCommand } from './commands/aliases.ts'
import { registerApplyCommand } from './commands/apply.ts'
import { registerCleanCommand } from './commands/clean.ts'
import { registerConfigCommand } from './commands/config-cmd.ts'
import { registerInitCommand } from './commands/init.ts'
import { registerProfileCommand } from './commands/profile.ts'
import { registerStatusCommand } from './commands/status.ts'

/** Creates the Commander program with all subcommands registered. */
export function createProgram(version: string): Command {
  const program = new Command()

  program
    .name('git-setup')
    .description('Automated Git, SSH & GPG environment setup for macOS')
    .version(version, '-v, --version')
    .option('-d, --dry-run', 'simulate without making changes', false)
    .option('-y, --yes', 'skip confirmation prompts', false)
    .option('--verbose', 'show detailed output', false)

  registerInitCommand(program)
  registerApplyCommand(program)
  registerProfileCommand(program)
  registerConfigCommand(program)
  registerStatusCommand(program)
  registerAliasesCommand(program)
  registerCleanCommand(program)

  program.action(async (_opts, cmd) => {
    const subcommand = (await configExists()) ? 'apply' : 'init'
    const label =
      subcommand === 'apply'
        ? 'Configuration found. Applying...'
        : 'No configuration found. Starting setup wizard...'
    logInfo(label)
    await program.parseAsync(
      [
        ...process.argv.slice(0, 2),
        subcommand,
        ...rawGlobalFlags(cmd.optsWithGlobals()),
      ],
      {
        from: 'node',
      },
    )
  })

  return program
}

/** Converts parsed global options back to flag strings for subcommand forwarding. */
function rawGlobalFlags(opts: Record<string, unknown>): string[] {
  const flags: string[] = []
  if (opts.dryRun) flags.push('--dry-run')
  if (opts.yes) flags.push('--yes')
  if (opts.verbose) flags.push('--verbose')
  return flags
}
