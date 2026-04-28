/**
 * File: src/utils/executor.ts
 * Description: Dry-run aware command execution wrapper
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import type { ExecResult } from '../core/types.ts'
import { logInfo } from './logger.ts'

const execFileAsync = promisify(execFile)

/** Executes a command, respecting dry-run mode. Returns stdout/stderr. */
export async function executeCommand(
  description: string,
  command: string,
  args: readonly string[],
  dryRun: boolean,
): Promise<ExecResult> {
  if (dryRun) {
    logInfo(`[DRY-RUN] ${description}: ${command} ${args.join(' ')}`)
    return { stdout: '', stderr: '' }
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, [...args])
    return { stdout, stderr }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Command failed (${description}): ${message}`)
  }
}

/** Spawns an interactive command with inherited stdio (for GPG key generation). */
export async function executeInteractive(
  description: string,
  command: string,
  args: readonly string[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    logInfo(`[DRY-RUN] ${description}: ${command} ${args.join(' ')}`)
    return
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: 'inherit' })
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${description} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}
