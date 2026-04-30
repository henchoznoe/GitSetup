/**
 * File: src/cli/commands/aliases.ts
 * Description: Aliases command — lists all Git aliases installed by GitSetup
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import type { Command } from 'commander'
import { GIT_ALIASES } from '../../core/constants.ts'
import { logInfo } from '../../utils/logger.ts'

/** Registers the aliases subcommand. */
export function registerAliasesCommand(program: Command): void {
  program
    .command('aliases')
    .description('list all Git aliases installed by GitSetup')
    .action(() => {
      runAliases()
    })
}

/** Displays all Git aliases with descriptions. */
function runAliases(): void {
  logInfo('Git aliases installed by GitSetup:\n')

  const maxAlias = Math.max(...GIT_ALIASES.map(a => a.alias.length))
  const maxCmd = Math.max(...GIT_ALIASES.map(a => a.command.length))

  for (const { alias, command, description } of GIT_ALIASES) {
    const paddedAlias = alias.padEnd(maxAlias)
    const paddedCmd = command.padEnd(maxCmd)
    process.stdout.write(
      `  git ${paddedAlias}  →  git ${paddedCmd}  ${description}\n`,
    )
  }
}
