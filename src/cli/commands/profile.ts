/**
 * File: src/cli/commands/profile.ts
 * Description: Profile management — list, add, edit, remove identity profiles
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { join } from 'node:path'
import * as p from '@clack/prompts'
import type { Command } from 'commander'
import {
  configExists,
  loadJsonConfig,
  saveConfig,
  toAppConfig,
} from '../../core/config.ts'
import { SSH_KEY_TYPE } from '../../core/constants.ts'
import type { JsonConfig, Profile } from '../../core/types.ts'
import { pathExists } from '../../utils/file-ops.ts'
import { logError, logInfo, logSuccess } from '../../utils/logger.ts'
import { sanitizeHost } from '../../utils/sanitize.ts'
import { applyConfig, buildAppOptions } from './apply.ts'

/** Registers the profile subcommand with list/add/edit/remove. */
export function registerProfileCommand(program: Command): void {
  const profileCmd = program
    .command('profile')
    .description('manage identity profiles')

  profileCmd
    .command('list')
    .description('show all configured profiles')
    .action(async () => {
      await runProfileList()
    })

  profileCmd
    .command('add')
    .description('add a new host:email profile')
    .option('--host <host>', 'host name (non-interactive)')
    .option('--email <email>', 'email address (non-interactive)')
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals()
      await runProfileAdd(opts, globalOpts)
    })

  profileCmd
    .command('edit')
    .description('change the email of an existing profile')
    .option('--host <host>', 'host to edit (non-interactive)')
    .option('--email <email>', 'new email address (non-interactive)')
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals()
      await runProfileEdit(opts, globalOpts)
    })

  profileCmd
    .command('remove')
    .description('remove a profile')
    .option('--host <host>', 'host to remove (non-interactive)')
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals()
      await runProfileRemove(opts, globalOpts)
    })
}

/** Displays all configured profiles with SSH key status. */
async function runProfileList(): Promise<void> {
  const config = await loadConfigOrExit()

  if (config.profiles.length === 0) {
    logInfo('No profiles configured.')
    return
  }

  const sshDir = join(process.env.HOME ?? '', '.ssh')

  logInfo('Configured profiles:')
  for (const profile of config.profiles) {
    const keyName = `id_${SSH_KEY_TYPE}_${sanitizeHost(profile.host)}`
    const keyPath = join(sshDir, keyName)
    const hasKey = await pathExists(keyPath)
    const icon = hasKey ? '✓' : '✗'
    const keyStatus = hasKey ? 'SSH key present' : 'SSH key missing'
    process.stdout.write(
      `  ${icon} ${profile.host} → ${profile.email} (${keyStatus})\n`,
    )
  }
}

/** Adds a new profile to the config. */
async function runProfileAdd(
  opts: Record<string, unknown>,
  globalOpts: Record<string, unknown>,
): Promise<void> {
  const config = await loadConfigOrExit()

  let host: string
  let email: string

  if (opts.host && opts.email) {
    host = String(opts.host)
    email = String(opts.email)
  } else {
    const hostInput = await p.text({
      message: 'Host (e.g., github.com):',
      placeholder: 'github.com',
      validate: v => {
        if (!v || v.trim().length === 0) return 'Host is required'
      },
    })
    if (p.isCancel(hostInput)) {
      p.cancel('Cancelled.')
      return
    }
    host = hostInput

    const emailInput = await p.text({
      message: `Email for ${host}:`,
      validate: v => {
        if (!v?.includes('@')) return 'A valid email is required'
      },
    })
    if (p.isCancel(emailInput)) {
      p.cancel('Cancelled.')
      return
    }
    email = emailInput
  }

  const exists = config.profiles.some(pr => pr.host === host)
  if (exists) {
    logError(
      `Profile for ${host} already exists. Use \`profile edit\` instead.`,
    )
    return
  }

  const newProfile: Profile = { host, email }
  const updated: JsonConfig = {
    ...config,
    profiles: [...config.profiles, newProfile],
  }

  await saveConfig(updated)
  logSuccess(`Added profile: ${host} → ${email}`)
  await promptApplyChanges(updated, globalOpts)
}

/** Edits the email of an existing profile. */
async function runProfileEdit(
  opts: Record<string, unknown>,
  globalOpts: Record<string, unknown>,
): Promise<void> {
  const config = await loadConfigOrExit()

  if (config.profiles.length === 0) {
    logInfo('No profiles to edit.')
    return
  }

  let host: string

  if (opts.host) {
    host = String(opts.host)
  } else {
    const selected = await p.select({
      message: 'Select profile to edit:',
      options: config.profiles.map(profile => ({
        value: profile.host,
        label: `${profile.host} → ${profile.email}`,
      })),
    })
    if (p.isCancel(selected)) {
      p.cancel('Cancelled.')
      return
    }
    host = selected
  }

  const existing = config.profiles.find(pr => pr.host === host)
  if (!existing) {
    logError(`No profile found for host: ${host}`)
    return
  }

  let email: string

  if (opts.email) {
    email = String(opts.email)
  } else {
    const emailInput = await p.text({
      message: `New email for ${host}:`,
      placeholder: existing.email,
      validate: v => {
        if (!v?.includes('@')) return 'A valid email is required'
      },
    })
    if (p.isCancel(emailInput)) {
      p.cancel('Cancelled.')
      return
    }
    email = emailInput
  }

  const updatedProfiles = config.profiles.map(pr =>
    pr.host === host ? { host, email } : pr,
  )
  const updated: JsonConfig = { ...config, profiles: updatedProfiles }

  await saveConfig(updated)
  logSuccess(`Updated profile: ${host} → ${email}`)
  await promptApplyChanges(updated, globalOpts)
}

/** Removes a profile from the config. */
async function runProfileRemove(
  opts: Record<string, unknown>,
  globalOpts: Record<string, unknown>,
): Promise<void> {
  const config = await loadConfigOrExit()

  if (config.profiles.length === 0) {
    logInfo('No profiles to remove.')
    return
  }

  let host: string

  if (opts.host) {
    host = String(opts.host)
  } else {
    const selected = await p.select({
      message: 'Select profile to remove:',
      options: config.profiles.map(profile => ({
        value: profile.host,
        label: `${profile.host} → ${profile.email}`,
      })),
    })
    if (p.isCancel(selected)) {
      p.cancel('Cancelled.')
      return
    }
    host = selected
  }

  const filtered = config.profiles.filter(pr => pr.host !== host)
  if (filtered.length === config.profiles.length) {
    logError(`No profile found for host: ${host}`)
    return
  }

  if (filtered.length === 0) {
    logError('Cannot remove the last profile. At least one is required.')
    return
  }

  const updated: JsonConfig = { ...config, profiles: filtered }
  await saveConfig(updated)
  logSuccess(`Removed profile: ${host}`)
  await promptApplyChanges(updated, globalOpts)
}

/** Asks user to apply changes immediately after a profile mutation. */
async function promptApplyChanges(
  config: JsonConfig,
  globalOpts: Record<string, unknown>,
): Promise<void> {
  const shouldApply = await p.confirm({
    message: 'Apply changes now?',
    initialValue: true,
  })
  if (p.isCancel(shouldApply) || !shouldApply) {
    logInfo('Run `git-setup apply` when ready.')
    return
  }

  const options = buildAppOptions(globalOpts)
  await applyConfig(toAppConfig(config), options)
}

/** Loads JSON config or exits with error. */
async function loadConfigOrExit(): Promise<JsonConfig> {
  if (!(await configExists())) {
    logError('No configuration found. Run `git-setup init` first.')
    process.exit(1)
  }
  return loadJsonConfig()
}
