/**
 * File: src/managers/gpg-manager.ts
 * Description: GPG key discovery, generation, and armored export
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

/** Result of preparing GPG keys for the configured identities. */
interface GpgPreparation {
  readonly summary: string
  readonly primaryKeyId: string | null
}

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

/**
 * Discovers (and optionally generates) GPG keys for all configured identities.
 * Exports each key in armored form. Returns the primary key id used for signing,
 * along with a summary string. Does not mutate global git config — that is the
 * responsibility of the gitconfig template (see configureGitGlobal).
 */
export async function prepareGpgKeys(
  config: AppConfig,
  options: AppOptions,
): Promise<GpgPreparation> {
  if (!config.enableGpgSigning) {
    logInfo('GPG signing is disabled, skipping')
    return { summary: 'Skipped GPG (disabled)', primaryKeyId: null }
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

  if (options.dryRun) {
    return { summary: 'Would configure GPG signing', primaryKeyId }
  }
  if (keysFound > 0) {
    return {
      summary: `Configured GPG signing (${keysFound} key(s))`,
      primaryKeyId,
    }
  }
  return { summary: 'GPG enabled but no keys configured', primaryKeyId: null }
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
