/**
 * File: src/managers/ssh-manager.ts
 * Description: SSH key generation and config block management
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  SSH_DIR_PERMISSIONS,
  SSH_FILE_PERMISSIONS,
  SSH_KEY_TYPE,
  SSH_MARKER_END,
  SSH_MARKER_START,
} from '../core/constants.ts'
import type { AppConfig, AppOptions } from '../core/types.ts'
import { executeCommand } from '../utils/executor.ts'
import { updateFileBlock } from '../utils/file-block.ts'
import { backupFile, ensureDirectory, pathExists } from '../utils/file-ops.ts'
import { logInfo, logSuccess } from '../utils/logger.ts'
import { getSshKeyUrl, sanitizeHost } from '../utils/sanitize.ts'
import { withSpinner } from '../utils/spinner.ts'

/** Generates SSH keys per profile and updates ~/.ssh/config with host entries. */
export async function setupSsh(
  config: AppConfig,
  options: AppOptions,
): Promise<string> {
  let keysCreated = 0
  let keysExisting = 0

  await withSpinner(
    '\u{1F511} Setting up SSH keys and configuration...',
    '\u{1F511} SSH setup complete',
    async () => {
      await ensureDirectory(options.sshDir, SSH_DIR_PERMISSIONS, options.dryRun)

      const configPath = join(options.sshDir, 'config')
      await backupFile(configPath, options.dryRun)

      const configEntries: string[] = []

      for (const profile of config.profiles) {
        const keyName = `id_${SSH_KEY_TYPE}_${sanitizeHost(profile.host)}`
        const keyPath = join(options.sshDir, keyName)
        const keyExists = await pathExists(keyPath)

        if (!keyExists) {
          logInfo(
            `Generating SSH key for ${profile.host} (${profile.email})...`,
          )
          await executeCommand(
            `Generate SSH key for ${profile.host}`,
            'ssh-keygen',
            [
              '-q',
              '-t',
              SSH_KEY_TYPE,
              '-C',
              profile.email,
              '-f',
              keyPath,
              '-N',
              '',
            ],
            options.dryRun,
          )
          keysCreated++
        } else {
          logInfo(`SSH key already exists for ${profile.host}`)
          keysExisting++
        }

        /* v8 ignore start */
        if (!options.dryRun && (await pathExists(`${keyPath}.pub`))) {
          const publicKey = await readFile(`${keyPath}.pub`, 'utf-8')
          logSuccess(`Public key for ${profile.host}:`)
          process.stdout.write(`  ${publicKey}`)
          const keyUrl = getSshKeyUrl(profile.host)
          if (keyUrl) logInfo(`Add this key at: ${keyUrl}`)
        }
        /* v8 ignore stop */

        configEntries.push(
          `Host ${profile.host}`,
          `  HostName ${profile.host}`,
          '  User git',
          `  IdentityFile ${keyPath}`,
          '  IdentitiesOnly yes',
          '',
        )
      }

      const configBlock = configEntries.join('\n').trimEnd()
      await updateFileBlock(
        configPath,
        SSH_MARKER_START,
        SSH_MARKER_END,
        configBlock,
        options.dryRun,
      )

      /* v8 ignore start */
      if (!options.dryRun) {
        const exists = await pathExists(configPath)
        if (exists) {
          const { chmod } = await import('node:fs/promises')
          await chmod(configPath, SSH_FILE_PERMISSIONS)
        }
      }
      /* v8 ignore stop */
    },
  )

  const verb = options.dryRun ? 'Would create' : 'Created'
  if (keysCreated > 0 && keysExisting > 0) {
    return `${verb} ${keysCreated} SSH key(s), ${keysExisting} already existed`
  }
  if (keysCreated > 0) return `${verb} ${keysCreated} SSH key(s)`
  return `${keysExisting} SSH key(s) already up to date`
}
