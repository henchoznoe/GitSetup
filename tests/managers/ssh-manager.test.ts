/**
 * File: tests/managers/ssh-manager.test.ts
 * Description: Tests for SSH key generation and config management
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AppConfig, AppOptions } from '@/core/types.ts'
import { setupSsh } from '@/managers/ssh-manager.ts'

vi.mock('@/utils/executor.ts', () => ({
  executeCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}))

vi.mock('@/utils/spinner.ts', () => ({
  withSpinner: vi.fn((_start, _stop, task) => task()),
}))

describe('setupSsh', () => {
  let tempDir: string
  let config: AppConfig
  let options: AppOptions

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-ssh-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    config = {
      gitUserName: 'Test User',
      gitUserEmailDefault: 'test@example.com',
      profiles: [
        { host: 'github.com', email: 'gh@test.com' },
        { host: 'gitlab.com', email: 'gl@test.com' },
      ],
      enableGpgSigning: false,
      gpgProgram: 'gpg',
      gitCoreEditor: 'nano',
      enableConventionalCommits: true,
      aliasOverrides: [],
    }

    options = {
      dryRun: false,
      assumeYes: true,
      verbose: false,
      sshDir: tempDir,
    }
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('generates SSH keys for profiles that lack them', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')

    await setupSsh(config, options)

    expect(executeCommand).toHaveBeenCalledWith(
      expect.stringContaining('github.com'),
      'ssh-keygen',
      expect.arrayContaining(['-t', 'ed25519']),
      false,
    )
  })

  it('skips key generation when key already exists', async () => {
    const keyPath = join(tempDir, 'id_ed25519_github_com')
    await writeFile(keyPath, 'fake key')
    await writeFile(`${keyPath}.pub`, 'ssh-ed25519 AAAA gh@test.com')

    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await setupSsh(config, options)

    const sshKeygenCalls = vi
      .mocked(executeCommand)
      .mock.calls.filter(
        call =>
          call[1] === 'ssh-keygen' && String(call[0]).includes('github.com'),
      )
    expect(sshKeygenCalls).toHaveLength(0)
  })

  it('writes SSH config with markers', async () => {
    await setupSsh(config, options)

    const configPath = join(tempDir, 'config')
    const content = await readFile(configPath, 'utf-8')
    expect(content).toContain('GITSETUP START')
    expect(content).toContain('GITSETUP END')
    expect(content).toContain('Host github.com')
    expect(content).toContain('Host gitlab.com')
    expect(content).toContain('IdentitiesOnly yes')
  })

  it('runs in dry-run mode without creating files', async () => {
    options = { ...options, dryRun: true }

    await setupSsh(config, options)

    const { executeCommand } = await import('@/utils/executor.ts')
    expect(executeCommand).toHaveBeenCalledWith(
      expect.anything(),
      'ssh-keygen',
      expect.anything(),
      true,
    )
  })

  it('returns summary with created keys count', async () => {
    const result = await setupSsh(config, options)
    expect(result).toContain('Created 2 SSH key(s)')
  })

  it('returns summary with existing keys count', async () => {
    await writeFile(join(tempDir, 'id_ed25519_github_com'), 'key')
    await writeFile(join(tempDir, 'id_ed25519_gitlab_com'), 'key')

    const result = await setupSsh(config, options)
    expect(result).toContain('already up to date')
  })

  it('returns mixed summary when some keys exist', async () => {
    await writeFile(join(tempDir, 'id_ed25519_github_com'), 'key')

    const result = await setupSsh(config, options)
    expect(result).toContain('Created 1 SSH key(s)')
    expect(result).toContain('1 already existed')
  })

  it('returns dry-run summary with "Would create"', async () => {
    options = { ...options, dryRun: true }

    const result = await setupSsh(config, options)
    expect(result).toContain('Would create 2 SSH key(s)')
  })
})
