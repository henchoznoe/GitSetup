/**
 * File: tests/utils/executor.test.ts
 * Description: Tests for command execution wrapper
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { executeCommand, executeInteractive } from '@/utils/executor.ts'

describe('executeCommand', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns empty result in dry-run mode', async () => {
    const result = await executeCommand('test', 'echo', ['hello'], true)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('')
  })

  it('executes command and returns stdout', async () => {
    const result = await executeCommand('echo test', 'echo', ['hello'], false)
    expect(result.stdout.trim()).toBe('hello')
  })

  it('throws on command failure', async () => {
    await expect(
      executeCommand('failing cmd', 'false', [], false),
    ).rejects.toThrow('Command failed')
  })

  it('throws on non-existent command', async () => {
    await expect(
      executeCommand('missing', 'nonexistent_command_xyz', [], false),
    ).rejects.toThrow('Command failed')
  })
})

describe('executeInteractive', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns immediately in dry-run mode', async () => {
    await expect(
      executeInteractive('test', 'echo', ['hi'], true),
    ).resolves.toBeUndefined()
  })

  it('executes interactive command successfully', async () => {
    await expect(
      executeInteractive('echo test', 'echo', ['hello'], false),
    ).resolves.toBeUndefined()
  })

  it('rejects on command failure', async () => {
    await expect(
      executeInteractive('failing', 'false', [], false),
    ).rejects.toThrow('exited with code')
  })

  it('rejects on non-existent command', async () => {
    await expect(
      executeInteractive('missing', 'nonexistent_command_xyz', [], false),
    ).rejects.toThrow()
  })
})
