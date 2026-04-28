/**
 * File: src/utils/file-block.ts
 * Description: Marker-based non-destructive file block editing
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { readFile } from 'node:fs/promises'
import { pathExists, writeFileSafe } from './file-ops.ts'
import { logInfo } from './logger.ts'

/**
 * Inserts, replaces, or removes a block of content between marker lines.
 * Empty newContent removes the block entirely (including markers).
 */
export async function updateFileBlock(
  filePath: string,
  startMarker: string,
  endMarker: string,
  newContent: string,
  dryRun: boolean,
): Promise<void> {
  const exists = await pathExists(filePath)

  if (!exists) {
    if (newContent === '') return

    if (dryRun) {
      logInfo(`[DRY-RUN] Would create ${filePath} with managed block`)
      return
    }

    const block = `${startMarker}\n${newContent}\n${endMarker}\n`
    await writeFileSafe(filePath, block, undefined, false)
    return
  }

  const fileContent = await readFile(filePath, 'utf-8')
  const lines = fileContent.split('\n')
  const outputLines: string[] = []
  let insideBlock = false

  for (const line of lines) {
    if (line.trim() === startMarker.trim()) {
      insideBlock = true
      if (newContent !== '') {
        outputLines.push(startMarker)
        outputLines.push(newContent)
      }
      continue
    }

    if (line.trim() === endMarker.trim()) {
      insideBlock = false
      if (newContent !== '') {
        outputLines.push(endMarker)
      }
      continue
    }

    if (!insideBlock) {
      outputLines.push(line)
    }
  }

  if (!fileContent.includes(startMarker) && newContent !== '') {
    if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
      outputLines.push('')
    }
    outputLines.push(startMarker)
    outputLines.push(newContent)
    outputLines.push(endMarker)
  }

  const result = outputLines.join('\n')

  if (dryRun) {
    logInfo(`[DRY-RUN] Would update managed block in ${filePath}`)
    return
  }

  await writeFileSafe(filePath, result, undefined, false)
}
