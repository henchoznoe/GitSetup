/**
 * File: src/managers/git-manager.ts
 * Description: Git global configuration, gitignore, and hook installation
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  GIT_TEMPLATE_DIR,
  GITCONFIG_DEST,
  GITIGNORE_DEST,
  HOOKS_DIR,
  resolveAliases,
} from '../core/constants.ts'
import type { AppConfig, AppOptions, GpgKeyFinder } from '../core/types.ts'
import { renderGitconfig } from '../templates/gitconfig.ts'
import { renderGitignore } from '../templates/gitignore.ts'
import {
  renderConventionalCommitHook,
  renderIdentitySwitchHook,
} from '../templates/hooks.ts'
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

/** Optional extras embedded in the rendered .gitconfig. */
interface GitConfigExtras {
  readonly gpgPrimaryKey?: string | null
}

/** Applies the global .gitconfig from the template. Returns summary. */
export async function configureGitGlobal(
  config: AppConfig,
  options: AppOptions,
  extras: GitConfigExtras = {},
): Promise<string> {
  const destPath = homePath(GITCONFIG_DEST)
  const exists = await pathExists(destPath)

  if (exists) {
    if (options.dryRun) {
      return 'Would overwrite .gitconfig'
    }
    await showGitconfigChanges(destPath, config)
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
    '\u{2699}\u{FE0F} Configuring global .gitconfig...',
    '\u{2699}\u{FE0F} Global .gitconfig configured',
    async () => {
      const aliases = resolveAliases(config.aliasOverrides)
      const gpgSigning =
        config.enableGpgSigning && extras.gpgPrimaryKey
          ? { signingKey: extras.gpgPrimaryKey, program: config.gpgProgram }
          : undefined
      const content = renderGitconfig({
        userName: config.gitUserName,
        userEmail: config.gitUserEmailDefault,
        coreEditor: config.gitCoreEditor,
        aliases,
        templateDir: homePath(GIT_TEMPLATE_DIR),
        gpgSigning,
      })
      await writeFileSafe(destPath, content, undefined, options.dryRun)
    },
  )

  if (options.dryRun) return 'Would create .gitconfig'
  return 'Wrote .gitconfig'
}

/** Applies the global .gitignore from the template. Returns summary. */
export async function configureGitIgnore(options: AppOptions): Promise<string> {
  const destPath = homePath(GITIGNORE_DEST)
  const exists = await pathExists(destPath)

  if (exists) {
    if (options.dryRun) {
      return 'Would overwrite .gitignore_global'
    }
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
    '\u{2699}\u{FE0F} Configuring global .gitignore...',
    '\u{2699}\u{FE0F} Global .gitignore configured',
    async () => {
      const content = renderGitignore()
      await writeFileSafe(destPath, content, undefined, options.dryRun)
    },
  )

  if (options.dryRun) return 'Would create .gitignore_global'
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
    '\u{1F517} Installing Git hooks...',
    '\u{1F517} Git hooks installed',
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
    },
  )

  const verb = options.dryRun ? 'Would install' : 'Installed'
  return `${verb} ${hookCount} hook(s)`
}

/** Extracts a value from a gitconfig-style file by key pattern. */
export function extractGitconfigValue(
  content: string,
  key: string,
): string | null {
  const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm')
  const match = content.match(regex)
  return match ? match[1].trim() : null
}

/** Shows what values will change when overwriting .gitconfig. */
async function showGitconfigChanges(
  existingPath: string,
  config: AppConfig,
): Promise<void> {
  const existing = await readFile(existingPath, 'utf-8')
  const changes: string[] = []

  const currentName = extractGitconfigValue(existing, 'name')
  if (currentName && currentName !== config.gitUserName) {
    changes.push(`  name: ${currentName} → ${config.gitUserName}`)
  }

  const currentEmail = extractGitconfigValue(existing, 'email')
  if (currentEmail && currentEmail !== config.gitUserEmailDefault) {
    changes.push(`  email: ${currentEmail} → ${config.gitUserEmailDefault}`)
  }

  const currentEditor = extractGitconfigValue(existing, 'editor')
  if (currentEditor && currentEditor !== config.gitCoreEditor) {
    changes.push(`  editor: ${currentEditor} → ${config.gitCoreEditor}`)
  }

  if (changes.length > 0) {
    logInfo('Changes detected:')
    for (const change of changes) {
      process.stdout.write(`${change}\n`)
    }
  } else {
    logInfo('No value changes detected (structure/formatting may differ)')
  }
}
