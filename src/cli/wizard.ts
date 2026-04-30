/**
 * File: src/cli/wizard.ts
 * Description: Interactive setup wizard using @clack/prompts
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as p from '@clack/prompts'
import type { JsonConfig, Profile } from '../core/types.ts'

/** Runs the interactive wizard and returns a JsonConfig (no file I/O). */
export async function runWizard(): Promise<JsonConfig> {
  p.intro('\u{1F6E0}\u{FE0F}  git-setup — interactive configuration')

  p.log.info('Your identity will appear in every commit you make.')

  const name = await p.text({
    message: 'What is your full name?',
    placeholder: 'John Doe',
    validate: v => {
      if (!v || v.trim().length === 0) return 'Name is required'
    },
  })
  if (p.isCancel(name)) return cancelAndExit()

  const defaultEmail = await p.text({
    message: 'What is your default email?',
    placeholder: 'you@example.com',
    validate: v => {
      if (!v?.includes('@')) return 'A valid email is required'
    },
  })
  if (p.isCancel(defaultEmail)) return cancelAndExit()

  p.log.info(
    'Profiles link a Git host to an email. An SSH key will be generated per profile.',
  )

  const profiles = await collectProfiles()

  p.log.info(
    'The editor is used for commit messages, interactive rebases, etc.',
  )

  const editorOptions = [
    { value: 'nano', label: 'nano' },
    { value: 'vim', label: 'vim' },
    { value: 'code --wait', label: 'VS Code' },
    { value: 'custom', label: 'Other (type manually)' },
  ]
  const editor = await p.select({
    message: 'Select your preferred Git editor:',
    options: editorOptions,
  })
  if (p.isCancel(editor)) return cancelAndExit()

  let finalEditor: string = editor
  if (editor === 'custom') {
    const customEditor = await p.text({
      message: 'Enter your editor command:',
      placeholder: 'subl -w',
      validate: v => {
        if (!v || v.trim().length === 0) return 'Editor is required'
      },
    })
    if (p.isCancel(customEditor)) return cancelAndExit()
    finalEditor = customEditor
  }

  p.log.info(
    'GPG signing adds cryptographic proof to your commits — most users skip this.',
  )

  const gpgEnabled = await p.confirm({
    message: 'Enable GPG commit signing?',
    initialValue: false,
  })
  if (p.isCancel(gpgEnabled)) return cancelAndExit()

  let gpgProgram = 'gpg'
  if (gpgEnabled) {
    const program = await p.text({
      message: 'GPG program path:',
      defaultValue: 'gpg',
      placeholder: 'gpg',
    })
    if (p.isCancel(program)) return cancelAndExit()
    gpgProgram = program
  }

  p.log.info(
    'Conventional Commits enforce a standard format (feat:, fix:, etc.) on commit messages.',
  )

  const conventionalCommits = await p.confirm({
    message: 'Enforce Conventional Commits format?',
    initialValue: true,
  })
  if (p.isCancel(conventionalCommits)) return cancelAndExit()

  const config: JsonConfig = {
    version: 1,
    user: { name, defaultEmail },
    profiles,
    editor: finalEditor,
    gpg: { enabled: gpgEnabled, program: gpgProgram },
    hooks: { conventionalCommits },
  }

  p.note(formatSummary(config), 'Configuration summary')

  return config
}

/** Collects profiles in a loop until user stops adding. */
async function collectProfiles(): Promise<Profile[]> {
  const profiles: Profile[] = []

  while (true) {
    const host = await p.text({
      message:
        profiles.length === 0
          ? 'Add a Git host (e.g., github.com):'
          : 'Host for next profile:',
      placeholder: 'github.com',
      validate: v => {
        if (!v || v.trim().length === 0) return 'Host is required'
      },
    })
    if (p.isCancel(host)) return cancelAndExit()

    const email = await p.text({
      message: `Email for ${host}:`,
      placeholder: `you@${host}`,
      validate: v => {
        if (!v?.includes('@')) return 'A valid email is required'
      },
    })
    if (p.isCancel(email)) return cancelAndExit()

    profiles.push({ host, email })

    const addMore = await p.confirm({
      message: 'Add another profile?',
      initialValue: false,
    })
    if (p.isCancel(addMore)) return cancelAndExit()
    if (!addMore) break
  }

  return profiles
}

/** Formats config as a readable summary string including affected files. */
function formatSummary(config: JsonConfig): string {
  const hookCount = config.hooks.conventionalCommits ? 4 : 3

  const lines: string[] = [
    'Configuration:',
    `  Name:     ${config.user.name}`,
    `  Email:    ${config.user.defaultEmail}`,
    `  Editor:   ${config.editor}`,
    `  GPG:      ${config.gpg.enabled ? `enabled (${config.gpg.program})` : 'disabled'}`,
    `  Hooks:    Conventional Commits ${config.hooks.conventionalCommits ? 'enabled' : 'disabled'}`,
    '',
    'Profiles:',
    ...config.profiles.map(pr => `  ${pr.host} → ${pr.email}`),
    '',
    'Files that will be created/modified:',
    '  ~/.gitconfig',
    '  ~/.gitignore_global',
    ...config.profiles.map(
      pr => `  ~/.ssh/id_ed25519_${pr.host.replaceAll('.', '_')}`,
    ),
    '  ~/.ssh/config',
    `  ~/.git_template/hooks/ (${hookCount} hooks)`,
  ]
  return lines.join('\n')
}

/** Handles user cancellation. */
function cancelAndExit(): never {
  p.cancel('Setup cancelled.')
  process.exit(0)
}
