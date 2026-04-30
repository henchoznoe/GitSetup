/**
 * File: src/managers/git-manager.ts
 * Description: Git global configuration, gitignore, and hook installation
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { join } from 'node:path'
import {
  GIT_TEMPLATE_DIR,
  GITCONFIG_DEST,
  GITIGNORE_DEST,
  HOOKS_DIR,
} from '../core/constants.ts'
import type { AppConfig, AppOptions, GpgKeyFinder } from '../core/types.ts'
import { renderGitconfig } from '../templates/gitconfig.ts'
import { renderGitignore } from '../templates/gitignore.ts'
import {
  renderConventionalCommitHook,
  renderIdentitySwitchHook,
} from '../templates/hooks.ts'
import { executeCommand } from '../utils/executor.ts'
import {
  backupFile,
  ensureDirectory,
  homePath,
  pathExists,
  writeFileSafe,
} from '../utils/file-ops.ts'
import { logInfo } from '../utils/logger.ts'
import { confirmAction } from '../utils/prompt.ts'
import { withSpinner } from '../utils/spinner.ts'

const HOOK_FILE_MODE = 0o755

/** Applies the global .gitconfig from the template. Returns summary. */
export async function configureGitGlobal(
  config: AppConfig,
  options: AppOptions,
): Promise<string> {
  const destPath = homePath(GITCONFIG_DEST)
  const exists = await pathExists(destPath)

  if (exists) {
    const confirmed = await confirmAction(
      `${destPath} already exists. Overwrite?`,
      options.assumeYes,
    )
    if (!confirmed) {
      logInfo('Skipping .gitconfig')
      return 'Skipped .gitconfig (user declined)'
    }
    await backupFile(destPath, options.dryRun)
  }

  await withSpinner(
    'Configuring global .gitconfig...',
    'Global .gitconfig configured',
    async () => {
      const content = renderGitconfig({
        userName: config.gitUserName,
        userEmail: config.gitUserEmailDefault,
        coreEditor: config.gitCoreEditor,
      })
      await writeFileSafe(destPath, content, undefined, options.dryRun)
    },
  )

  return 'Wrote .gitconfig'
}

/** Applies the global .gitignore from the template. Returns summary. */
export async function configureGitIgnore(options: AppOptions): Promise<string> {
  const destPath = homePath(GITIGNORE_DEST)
  const exists = await pathExists(destPath)

  if (exists) {
    const confirmed = await confirmAction(
      `${destPath} already exists. Overwrite?`,
      options.assumeYes,
    )
    if (!confirmed) {
      logInfo('Skipping .gitignore_global')
      return 'Skipped .gitignore_global (user declined)'
    }
    await backupFile(destPath, options.dryRun)
  }

  await withSpinner(
    'Configuring global .gitignore...',
    'Global .gitignore configured',
    async () => {
      const content = renderGitignore()
      await writeFileSafe(destPath, content, undefined, options.dryRun)
    },
  )

  return 'Wrote .gitignore_global'
}

/** Installs Git hooks for identity switching and optional Conventional Commits. Returns summary. */
export async function installGitHooks(
  config: AppConfig,
  options: AppOptions,
  findGpgKey: GpgKeyFinder,
): Promise<string> {
  let hookCount = 3

  await withSpinner(
    'Installing Git hooks...',
    'Git hooks installed',
    async () => {
      const hooksDir = homePath(GIT_TEMPLATE_DIR, HOOKS_DIR)
      await ensureDirectory(hooksDir, 0o755, options.dryRun)

      const hookProfiles = await Promise.all(
        config.profiles.map(async profile => ({
          host: profile.host,
          email: profile.email,
          gpgKeyId: config.enableGpgSigning
            ? ((await findGpgKey(profile.email)) ?? undefined)
            : undefined,
        })),
      )

      const hookContent = renderIdentitySwitchHook(
        hookProfiles,
        config.gitUserEmailDefault,
      )

      const hookNames = ['post-checkout', 'post-commit', 'post-merge'] as const
      for (const hookName of hookNames) {
        const hookPath = join(hooksDir, hookName)
        await writeFileSafe(
          hookPath,
          hookContent,
          HOOK_FILE_MODE,
          options.dryRun,
        )
      }

      if (config.enableConventionalCommits) {
        const commitMsgContent = renderConventionalCommitHook()
        const commitMsgPath = join(hooksDir, 'commit-msg')
        await writeFileSafe(
          commitMsgPath,
          commitMsgContent,
          HOOK_FILE_MODE,
          options.dryRun,
        )
        hookCount = 4
        logInfo('Conventional Commits hook installed')
      }

      await executeCommand(
        'Set git template directory',
        'git',
        ['config', '--global', 'init.templatedir', homePath(GIT_TEMPLATE_DIR)],
        options.dryRun,
      )
    },
  )

  return `Installed ${hookCount} hook(s)`
}
