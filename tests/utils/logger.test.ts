/**
 * File: tests/utils/logger.test.ts
 * Description: Tests for colored logger utility
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { logError, logInfo, logSuccess, logWarning } from '@/utils/logger.ts'

describe('logger', () => {
  let stdoutOutput: string
  let stderrOutput: string

  beforeEach(() => {
    stdoutOutput = ''
    stderrOutput = ''
    vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
      stdoutOutput += String(chunk)
      return true
    })
    vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
      stderrOutput += String(chunk)
      return true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logInfo writes to stdout with INFO tag', () => {
    logInfo('test message')
    expect(stdoutOutput).toContain('[INFO]')
    expect(stdoutOutput).toContain('test message')
    expect(stdoutOutput.endsWith('\n')).toBe(true)
  })

  it('logSuccess writes to stdout with OK tag', () => {
    logSuccess('done')
    expect(stdoutOutput).toContain('[OK]')
    expect(stdoutOutput).toContain('done')
  })

  it('logWarning writes to stdout with WARN tag', () => {
    logWarning('careful')
    expect(stdoutOutput).toContain('[WARN]')
    expect(stdoutOutput).toContain('careful')
  })

  it('logError writes to stderr with ERR tag', () => {
    logError('failed')
    expect(stderrOutput).toContain('[ERR]')
    expect(stderrOutput).toContain('failed')
    expect(stdoutOutput).toBe('')
  })
})
