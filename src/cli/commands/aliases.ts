/**
 * File: src/cli/commands/aliases.ts
 * Description: Aliases command — lists all Git aliases installed by GitSetup
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import type { Command } from 'commander'
import { configExists, loadJsonConfig } from '../../core/config.ts'
import { resolveAliases } from '../../core/constants.ts'
import { logInfo } from '../../utils/logger.ts'

/** Registers the aliases subcommand. */
export function registerAliasesCommand(program: Command): void {
  program
    .command('aliases')
    .description('list all Git aliases installed by GitSetup')
    .action(async () => {
      await runAliases()
    })
}

/** Displays resolved Git aliases with descriptions. */
async function runAliases(): Promise<void> {
  const overrides = (await configExists())
    ? ((await loadJsonConfig()).aliases ?? [])
    : []
  const aliases = resolveAliases(overrides)

  logInfo('Git aliases installed by GitSetup:\n')

  const maxAlias = Math.max(...aliases.map(a => a.alias.length))
  const maxCmd = Math.max(...aliases.map(a => a.command.length))

  for (const { alias, command, description } of aliases) {
    const paddedAlias = alias.padEnd(maxAlias)
    const paddedCmd = command.padEnd(maxCmd)
    const tag = description === 'custom' ? ' (custom)' : ''
    process.stdout.write(
      `  git ${paddedAlias}  →  git ${paddedCmd}  ${description}${tag}\n`,
    )
  }
}
