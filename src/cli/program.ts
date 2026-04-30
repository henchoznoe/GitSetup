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
  registerCleanCommand(program)

  program.action(async (_opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals()
    if (await configExists()) {
      logInfo('Configuration found. Applying...')
      await cmd.parent?.commands
        .find((c: Command) => c.name() === 'apply')
        ?.parseAsync(['apply', ...rawGlobalFlags(globalOpts)], { from: 'user' })
    } else {
      logInfo('No configuration found. Starting setup wizard...')
      await cmd.parent?.commands
        .find((c: Command) => c.name() === 'init')
        ?.parseAsync(['init', ...rawGlobalFlags(globalOpts)], { from: 'user' })
    }
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
