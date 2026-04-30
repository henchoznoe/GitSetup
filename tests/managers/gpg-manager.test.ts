/**
 * File: tests/managers/gpg-manager.test.ts
 * Description: Tests for GPG key management
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import type { AppConfig, AppOptions } from '@/core/types.ts'
import { findGpgKey, setupGpg } from '@/managers/gpg-manager.ts'

vi.mock('@/utils/executor.ts', () => ({
  executeCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
  executeInteractive: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/utils/prompt.ts', () => ({
  confirmAction: vi.fn().mockResolvedValue(false),
}))

describe('findGpgKey', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns key ID when found in output', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockResolvedValueOnce({
      stdout: 'sec   rsa4096/ABC123DEF456 2024-01-01 [SC]\n      uid...',
      stderr: '',
    })

    const result = await findGpgKey('test@test.com', 'gpg')
    expect(result).toBe('ABC123DEF456')
  })

  it('returns null when no key found', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockRejectedValueOnce(new Error('no key'))

    const result = await findGpgKey('nobody@test.com', 'gpg')
    expect(result).toBeNull()
  })

  it('returns null when output does not match pattern', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockResolvedValueOnce({
      stdout: 'no matching keys',
      stderr: '',
    })

    const result = await findGpgKey('test@test.com', 'gpg')
    expect(result).toBeNull()
  })
})

describe('setupGpg', () => {
  let config: AppConfig
  let options: AppOptions

  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    config = {
      gitUserName: 'Test',
      gitUserEmailDefault: 'test@test.com',
      profiles: [{ host: 'github.com', email: 'gh@test.com' }],
      enableGpgSigning: true,
      gpgProgram: 'gpg',
      gitCoreEditor: 'nano',
      enableConventionalCommits: true,
    }

    options = {
      dryRun: false,
      assumeYes: true,
      verbose: false,
      sshDir: '/tmp',
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips setup when GPG signing is disabled', async () => {
    config = { ...config, enableGpgSigning: false }
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await setupGpg(config, options)

    expect(executeCommand).not.toHaveBeenCalled()
  })

  it('configures git signing when key is found', async () => {
    const executor = await import('@/utils/executor.ts')
    vi.mocked(executor.executeCommand).mockClear()
    vi.mocked(executor.executeCommand).mockImplementation(
      async (_desc, cmd) => {
        if (cmd === 'gpg') {
          return {
            stdout: 'sec   rsa4096/ABCDEF123456 2024-01-01 [SC]',
            stderr: '',
          }
        }
        return { stdout: '', stderr: '' }
      },
    )

    await setupGpg(config, options)

    const allCalls = vi.mocked(executor.executeCommand).mock.calls
    const gitConfigCalls = allCalls.filter(call => call[1] === 'git')
    expect(gitConfigCalls.length).toBeGreaterThan(0)
    expect(gitConfigCalls[0][2]).toContain('user.signingkey')
  })

  it('deduplicates emails across default and profiles', async () => {
    config = {
      ...config,
      gitUserEmailDefault: 'gh@test.com',
      profiles: [{ host: 'github.com', email: 'gh@test.com' }],
    }

    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()
    vi.mocked(executeCommand).mockImplementation(async (_desc, cmd) => {
      if (cmd === 'gpg') {
        return {
          stdout: 'sec   rsa4096/ABCDEF123456 2024-01-01 [SC]',
          stderr: '',
        }
      }
      return { stdout: '', stderr: '' }
    })

    await setupGpg(config, options)

    const gpgCalls = vi
      .mocked(executeCommand)
      .mock.calls.filter(call => call[1] === 'gpg')
    expect(gpgCalls).toHaveLength(1)
  })

  it('prompts to generate key when not found', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    const { confirmAction } = await import('@/utils/prompt.ts')

    vi.mocked(executeCommand).mockRejectedValue(new Error('no key'))
    vi.mocked(confirmAction).mockResolvedValue(false)

    await setupGpg(config, options)

    expect(confirmAction).toHaveBeenCalledWith(
      expect.stringContaining('Generate'),
      true,
    )
  })

  it('runs interactive generation when user confirms', async () => {
    const { executeCommand, executeInteractive } = await import(
      '@/utils/executor.ts'
    )
    const { confirmAction } = await import('@/utils/prompt.ts')

    vi.mocked(executeCommand).mockRejectedValue(new Error('no key'))
    vi.mocked(confirmAction).mockResolvedValue(true)
    vi.mocked(executeInteractive).mockResolvedValue(undefined)

    await setupGpg(config, options)

    expect(executeInteractive).toHaveBeenCalledWith(
      expect.stringContaining('Generate GPG key'),
      'gpg',
      ['--full-generate-key'],
      false,
    )
  })
})
