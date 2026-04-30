/**
 * File: src/cli/commands/config-cmd.ts
 * Description: Config management — show, edit, set, path
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { spawn } from 'node:child_process'
import type { Command } from 'commander'
import {
  configExists,
  getConfigPath,
  loadJsonConfig,
  saveConfig,
} from '../../core/config.ts'
import type { JsonConfig } from '../../core/types.ts'
import { logError, logInfo, logSuccess } from '../../utils/logger.ts'

/** Registers the config subcommand with show/edit/set/path. */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('manage configuration file')

  configCmd
    .command('show')
    .description('print current configuration')
    .action(async () => {
      await runConfigShow()
    })

  configCmd
    .command('edit')
    .description('open config in $EDITOR')
    .action(async () => {
      await runConfigEdit()
    })

  configCmd
    .command('set <key> <value>')
    .description('set a config key (dot notation)')
    .action(async (key: string, value: string) => {
      await runConfigSet(key, value)
    })

  configCmd
    .command('path')
    .description('print config file path')
    .action(() => {
      process.stdout.write(`${getConfigPath()}\n`)
    })
}

/** Displays current config in readable format. */
async function runConfigShow(): Promise<void> {
  if (!(await configExists())) {
    logError('No configuration found. Run `git-setup init` first.')
    return
  }

  const config = await loadJsonConfig()
  process.stdout.write(`${JSON.stringify(config, null, 2)}\n`)
}

/** Opens config file in user's editor. */
async function runConfigEdit(): Promise<void> {
  if (!(await configExists())) {
    logError('No configuration found. Run `git-setup init` first.')
    return
  }

  const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'nano'
  const configPath = getConfigPath()

  logInfo(`Opening ${configPath} in ${editor}...`)

  await new Promise<void>((resolve, reject) => {
    const child = spawn(editor, [configPath], { stdio: 'inherit' })
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Editor exited with code ${code}`))
    })
    child.on('error', reject)
  })

  try {
    await loadJsonConfig()
    logSuccess('Configuration is valid.')
  } catch (err) {
    logError(
      `Configuration is invalid: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/** Sets a single config value by dot-notation key. */
async function runConfigSet(key: string, value: string): Promise<void> {
  if (!(await configExists())) {
    logError('No configuration found. Run `git-setup init` first.')
    return
  }

  const config = await loadJsonConfig()
  const raw = JSON.parse(JSON.stringify(config)) as Record<string, unknown>
  const updated = setNestedValue(raw, key, parseValue(value))

  try {
    await saveConfig(updated as unknown as JsonConfig)
    logSuccess(`Set ${key} = ${value}`)
  } catch (err) {
    logError(
      `Invalid value: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/** Parses a string value to the appropriate type. */
function parseValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  const num = Number(value)
  if (!Number.isNaN(num) && value.trim() !== '') return num
  return value
}

/** Sets a value in a nested object by dot-notation path. */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.')
  const result = structuredClone(obj)

  let current: Record<string, unknown> = result
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (typeof current[k] !== 'object' || current[k] === null) {
      logError(`Invalid path: ${path}`)
      process.exit(1)
    }
    current = current[k] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
  return result
}
