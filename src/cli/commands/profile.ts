/**
 * File: src/cli/commands/profile.ts
 * Description: Profile management — list, add, remove identity profiles
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as p from '@clack/prompts'
import type { Command } from 'commander'
import { configExists, loadJsonConfig, saveConfig } from '../../core/config.ts'
import type { JsonConfig, Profile } from '../../core/types.ts'
import { logError, logInfo, logSuccess } from '../../utils/logger.ts'

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
    .action(async opts => {
      await runProfileAdd(opts)
    })

  profileCmd
    .command('edit')
    .description('change the email of an existing profile')
    .option('--host <host>', 'host to edit (non-interactive)')
    .option('--email <email>', 'new email address (non-interactive)')
    .action(async opts => {
      await runProfileEdit(opts)
    })

  profileCmd
    .command('remove')
    .description('remove a profile')
    .option('--host <host>', 'host to remove (non-interactive)')
    .action(async opts => {
      await runProfileRemove(opts)
    })
}

/** Displays all configured profiles. */
async function runProfileList(): Promise<void> {
  const config = await loadConfigOrExit()

  if (config.profiles.length === 0) {
    logInfo('No profiles configured.')
    return
  }

  logInfo('Configured profiles:')
  for (const profile of config.profiles) {
    process.stdout.write(`  ${profile.host} → ${profile.email}\n`)
  }
}

/** Adds a new profile to the config. */
async function runProfileAdd(opts: Record<string, unknown>): Promise<void> {
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

  const exists = config.profiles.some(p => p.host === host)
  if (exists) {
    logError(`Profile for ${host} already exists. Remove it first.`)
    return
  }

  const newProfile: Profile = { host, email }
  const updated: JsonConfig = {
    ...config,
    profiles: [...config.profiles, newProfile],
  }

  await saveConfig(updated)
  logSuccess(`Added profile: ${host} → ${email}`)
  logInfo('Run `git-setup apply` to apply changes.')
}

/** Edits the email of an existing profile. */
async function runProfileEdit(opts: Record<string, unknown>): Promise<void> {
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
  logInfo('Run `git-setup apply` to apply changes.')
}

/** Removes a profile from the config. */
async function runProfileRemove(opts: Record<string, unknown>): Promise<void> {
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

  const filtered = config.profiles.filter(p => p.host !== host)
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
  logInfo('Run `git-setup apply` to apply changes.')
}

/** Loads JSON config or exits with error. */
async function loadConfigOrExit(): Promise<JsonConfig> {
  if (!(await configExists())) {
    logError('No configuration found. Run `git-setup init` first.')
    process.exit(1)
  }
  return loadJsonConfig()
}
