/**
 * File: src/managers/gpg-manager.ts
 * Description: GPG key discovery, generation, and git signing configuration
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { recordGeneratedGpgKey } from '../core/config.ts'
import type { AppConfig, AppOptions } from '../core/types.ts'
import { executeCommand } from '../utils/executor.ts'
import { logInfo, logSuccess, logWarning } from '../utils/logger.ts'
import { confirmAction } from '../utils/prompt.ts'
import { withSpinner } from '../utils/spinner.ts'

/** Finds an existing GPG key ID for the given email. Returns null if not found. */
export async function findGpgKey(
  email: string,
  gpgProgram: string,
): Promise<string | null> {
  try {
    const { stdout } = await executeCommand(
      `Find GPG key for ${email}`,
      gpgProgram,
      ['--list-secret-keys', '--keyid-format', 'long', email],
      false,
    )

    const match = stdout.match(/sec\s+\w+\/([A-F0-9]+)/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/** Sets up GPG signing for all configured email identities. Returns summary. */
export async function setupGpg(
  config: AppConfig,
  options: AppOptions,
): Promise<string> {
  if (!config.enableGpgSigning) {
    logInfo('GPG signing is disabled, skipping')
    return 'Skipped GPG (disabled)'
  }

  const uniqueEmails = [
    config.gitUserEmailDefault,
    ...config.profiles.map(p => p.email),
  ].filter((email, index, array) => array.indexOf(email) === index)

  let keysFound = 0
  let primaryKeyId: string | null = null

  for (const email of uniqueEmails) {
    let keyId = await findGpgKey(email, config.gpgProgram)

    if (!keyId) {
      logWarning(`No GPG key found for ${email}`)
      const shouldGenerate = await confirmAction(
        `Generate a new GPG key for ${email}?`,
        options.assumeYes,
      )

      if (shouldGenerate) {
        await withSpinner(
          `\u{1F50F} Generating GPG key for ${email}...`,
          `\u{1F50F} GPG key generated for ${email}`,
          () =>
            generateGpgKey(
              config.gitUserName,
              email,
              config.gpgProgram,
              options.dryRun,
            ),
        )
        keyId = await findGpgKey(email, config.gpgProgram)
        if (keyId && !options.dryRun) {
          await recordGeneratedGpgKey(email, keyId)
        }
      }
    }

    if (keyId) {
      keysFound++
      if (!primaryKeyId) primaryKeyId = keyId
      await exportArmoredKey(email, keyId, config.gpgProgram, options.dryRun)
    }
  }

  if (primaryKeyId) {
    await configureGitSigning(primaryKeyId, config.gpgProgram, options.dryRun)
  }

  if (options.dryRun) return 'Would configure GPG signing'
  if (keysFound > 0) return `Configured GPG signing (${keysFound} key(s))`
  return 'GPG enabled but no keys configured'
}

/** Generates a GPG key non-interactively (rsa4096, no expiry). */
async function generateGpgKey(
  name: string,
  email: string,
  gpgProgram: string,
  dryRun: boolean,
): Promise<void> {
  await executeCommand(
    `Generate GPG key for ${email}`,
    gpgProgram,
    [
      '--batch',
      '--pinentry-mode',
      'loopback',
      '--passphrase',
      '',
      '--quick-generate-key',
      `${name} <${email}>`,
      'rsa4096',
      'default',
      '0',
    ],
    dryRun,
  )
}

/** Exports and displays the armored public key block for adding to GitHub/GitLab. */
async function exportArmoredKey(
  email: string,
  keyId: string,
  gpgProgram: string,
  dryRun: boolean,
): Promise<void> {
  const { stdout } = await executeCommand(
    `Export GPG public key for ${email}`,
    gpgProgram,
    ['--armor', '--export', keyId],
    dryRun,
  )

  if (stdout) {
    logSuccess(`GPG key for ${email} (${keyId}):`)
    logInfo('Add this key to GitHub/GitLab:\n')
    process.stdout.write(`${stdout}\n`)
  }
}

/** Configures git global settings for GPG signing. */
async function configureGitSigning(
  keyId: string,
  gpgProgram: string,
  dryRun: boolean,
): Promise<void> {
  const gitConfigs: [string, string][] = [
    ['user.signingkey', keyId],
    ['gpg.program', gpgProgram],
    ['commit.gpgsign', 'true'],
    ['tag.gpgsign', 'true'],
  ]

  for (const [key, value] of gitConfigs) {
    await executeCommand(
      `Set git config ${key}`,
      'git',
      ['config', '--global', key, value],
      dryRun,
    )
  }
}
