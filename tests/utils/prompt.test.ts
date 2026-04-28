/**
 * File: tests/utils/prompt.test.ts
 * Description: Tests for user confirmation prompts
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { Readable } from 'node:stream'
import { confirmAction } from '@/utils/prompt.ts'

describe('confirmAction', () => {
  it('returns true immediately when assumeYes is true', async () => {
    const result = await confirmAction('Proceed?', true)
    expect(result).toBe(true)
  })

  it('returns true when user answers y', async () => {
    const input = Readable.from(['y\n'])
    const originalStdin = process.stdin
    Object.defineProperty(process, 'stdin', { value: input, writable: true })

    const result = await confirmAction('Proceed?', false)
    expect(result).toBe(true)

    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
    })
  })

  it('returns true when user answers Y (uppercase)', async () => {
    const input = Readable.from(['Y\n'])
    const originalStdin = process.stdin
    Object.defineProperty(process, 'stdin', { value: input, writable: true })

    const result = await confirmAction('Proceed?', false)
    expect(result).toBe(true)

    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
    })
  })

  it('returns false when user answers n', async () => {
    const input = Readable.from(['n\n'])
    const originalStdin = process.stdin
    Object.defineProperty(process, 'stdin', { value: input, writable: true })

    const result = await confirmAction('Proceed?', false)
    expect(result).toBe(false)

    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
    })
  })

  it('returns false when user presses enter (empty)', async () => {
    const input = Readable.from(['\n'])
    const originalStdin = process.stdin
    Object.defineProperty(process, 'stdin', { value: input, writable: true })

    const result = await confirmAction('Proceed?', false)
    expect(result).toBe(false)

    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
    })
  })
})
