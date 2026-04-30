/**
 * File: src/utils/file-ops.ts
 * Description: File system operations with dry-run support
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import {
  chmod,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { logInfo } from './logger.ts'

/** Checks whether a file or directory exists at the given path. */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

/** Creates a timestamped backup of an existing file. Returns backup path or null. */
export async function backupFile(
  filePath: string,
  dryRun: boolean,
): Promise<string | null> {
  const exists = await pathExists(filePath)
  if (!exists) return null

  const date = new Date().toISOString().slice(0, 10)
  const backupPath = `${filePath}.bak.${date}`

  if (dryRun) {
    logInfo(`[DRY-RUN] Would backup ${filePath} → ${backupPath}`)
    return backupPath
  }

  const content = await readFile(filePath, 'utf-8')
  await writeFile(backupPath, content, 'utf-8')
  logInfo(`Backed up ${filePath} → ${backupPath}`)
  return backupPath
}

/** Ensures a directory exists with the specified permissions. */
export async function ensureDirectory(
  dirPath: string,
  mode: number,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    const exists = await pathExists(dirPath)
    if (!exists) {
      logInfo(`[DRY-RUN] Would create directory ${dirPath}`)
    }
    return
  }

  await mkdir(dirPath, { recursive: true, mode })
}

/** Writes content to a file with optional permissions. Atomic via temp file + rename. */
export async function writeFileSafe(
  filePath: string,
  content: string,
  mode: number | undefined,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    logInfo(`[DRY-RUN] Would write ${filePath}`)
    return
  }

  const tmpPath = `${filePath}.tmp.${Date.now()}`
  await writeFile(tmpPath, content, 'utf-8')
  if (mode !== undefined) {
    await chmod(tmpPath, mode)
  }
  await rename(tmpPath, filePath)
}

/** Builds a full path relative to the user's home directory. */
export function homePath(...segments: string[]): string {
  const home = process.env.HOME
  if (!home) throw new Error('HOME environment variable is not set')
  return join(home, ...segments)
}
