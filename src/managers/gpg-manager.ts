/**
 * File: src/managers/gpg-manager.ts
 * Description: GPG key discovery, generation, and git signing configuration
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

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

  let keysFound = 0

  await withSpinner(
    '\u{1F50F} Setting up GPG signing...',
    '\u{1F50F} GPG setup complete',
    async () => {
      const uniqueEmails = [
        config.gitUserEmailDefault,
        ...config.profiles.map(p => p.email),
      ].filter((email, index, array) => array.indexOf(email) === index)

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
            await generateGpgKey(
              config.gitUserName,
              email,
              config.gpgProgram,
              options.dryRun,
            )
            keyId = await findGpgKey(email, config.gpgProgram)
          }
        }

        if (keyId) {
          logSuccess(`GPG key for ${email}: ${keyId}`)
          if (!primaryKeyId) primaryKeyId = keyId
          keysFound++
        }
      }

      if (primaryKeyId) {
        await configureGitSigning(
          primaryKeyId,
          config.gpgProgram,
          options.dryRun,
        )
      }
    },
  )

  if (options.dryRun) return 'Would configure GPG signing'
  if (keysFound > 0) return `Configured GPG signing (${keysFound} key(s))`
  return 'GPG enabled but no keys configured'
}

/** Generates a GPG key non-interactively (ed25519, no expiry). */
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
      '--passphrase',
      '',
      '--quick-generate-key',
      `${name} <${email}>`,
      'default',
      'default',
      '0',
    ],
    dryRun,
  )
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
