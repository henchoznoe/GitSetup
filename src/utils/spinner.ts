/**
 * File: src/utils/spinner.ts
 * Description: Async task wrapper with visual spinner feedback
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as p from '@clack/prompts'

/** Runs an async task with a spinner. Shows startMsg while running, stopMsg on success. */
export async function withSpinner<T>(
  startMsg: string,
  stopMsg: string,
  task: () => Promise<T>,
): Promise<T> {
  const s = p.spinner()
  s.start(startMsg)
  try {
    const result = await task()
    s.stop(stopMsg)
    return result
  } catch (error) {
    s.error(startMsg)
    throw error
  }
}
