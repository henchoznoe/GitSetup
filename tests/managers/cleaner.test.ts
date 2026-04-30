/**
 * File: tests/managers/cleaner.test.ts
 * Description: Tests for cleanup functionality
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AppConfig, AppOptions } from '@/core/types.ts'
import { runCleaner } from '@/managers/cleaner.ts'
import { pathExists } from '@/utils/file-ops.ts'

vi.mock('@/utils/prompt.ts', () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/utils/executor.ts', () => ({
  executeCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}))

describe('runCleaner', () => {
  let tempDir: string
  let config: AppConfig
  let options: AppOptions

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-clean-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    config = {
      gitUserName: 'Test',
      gitUserEmailDefault: 'test@test.com',
      profiles: [{ host: 'github.com', email: 'gh@test.com' }],
      enableGpgSigning: false,
      gpgProgram: 'gpg',
      gitCoreEditor: 'nano',
      enableConventionalCommits: true,
      aliasOverrides: [],
      generatedGpgFingerprints: [],
    }

    options = {
      dryRun: false,
      assumeYes: true,
      verbose: false,
      sshDir: join(tempDir, '.ssh'),
    }

    process.env.HOME = tempDir

    await mkdir(join(tempDir, '.ssh'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
    const { confirmAction } = await import('@/utils/prompt.ts')
    vi.mocked(confirmAction).mockResolvedValue(true)
  })

  it('removes gitconfig and gitignore_global', async () => {
    await writeFile(join(tempDir, '.gitconfig'), 'config')
    await writeFile(join(tempDir, '.gitignore_global'), 'ignore')

    await runCleaner(config, options)

    expect(await pathExists(join(tempDir, '.gitconfig'))).toBe(false)
    expect(await pathExists(join(tempDir, '.gitignore_global'))).toBe(false)
  })

  it('removes git template directory', async () => {
    const templateDir = join(tempDir, '.git_template')
    await mkdir(join(templateDir, 'hooks'), { recursive: true })
    await writeFile(join(templateDir, 'hooks', 'post-checkout'), 'hook')

    await runCleaner(config, options)

    expect(await pathExists(templateDir)).toBe(false)
  })

  it('removes SSH keys for profiles', async () => {
    const sshDir = join(tempDir, '.ssh')
    await writeFile(join(sshDir, 'id_ed25519_github_com'), 'key')
    await writeFile(join(sshDir, 'id_ed25519_github_com.pub'), 'pubkey')

    await runCleaner(config, options)

    expect(await pathExists(join(sshDir, 'id_ed25519_github_com'))).toBe(false)
    expect(await pathExists(join(sshDir, 'id_ed25519_github_com.pub'))).toBe(
      false,
    )
  })

  it('removes GitSetup block from SSH config', async () => {
    const sshConfigPath = join(tempDir, '.ssh', 'config')
    const content = [
      'Host personal',
      '  HostName personal.com',
      '# ==================== GITSETUP START ====================',
      'Host github.com',
      '  HostName github.com',
      '# ==================== GITSETUP END ====================',
      'Host other',
      '  HostName other.com',
    ].join('\n')
    await writeFile(sshConfigPath, content)

    await runCleaner(config, options)

    const result = await readFile(sshConfigPath, 'utf-8')
    expect(result).toContain('Host personal')
    expect(result).toContain('Host other')
    expect(result).not.toContain('GITSETUP')
    expect(result).not.toContain('Host github.com')
  })

  it('cancels when user declines confirmation', async () => {
    const { confirmAction } = await import('@/utils/prompt.ts')
    vi.mocked(confirmAction).mockResolvedValue(false)

    await writeFile(join(tempDir, '.gitconfig'), 'config')

    await runCleaner(config, options)

    expect(await pathExists(join(tempDir, '.gitconfig'))).toBe(true)
  })

  it('runs in dry-run mode without deleting files or keys', async () => {
    options = { ...options, dryRun: true }
    const sshDir = options.sshDir

    await writeFile(join(tempDir, '.gitconfig'), 'config')
    await writeFile(join(tempDir, '.gitignore_global'), 'ignore')
    await mkdir(join(tempDir, '.git_template', 'hooks'), { recursive: true })
    await writeFile(join(sshDir, 'id_ed25519_github_com'), 'key')
    await writeFile(join(sshDir, 'id_ed25519_github_com.pub'), 'pub')
    await writeFile(join(sshDir, 'config'), 'ssh config')

    await runCleaner(config, options)

    expect(await pathExists(join(tempDir, '.gitconfig'))).toBe(true)
    expect(await pathExists(join(tempDir, '.gitignore_global'))).toBe(true)
    expect(await pathExists(join(tempDir, '.git_template'))).toBe(true)
    expect(await pathExists(join(sshDir, 'id_ed25519_github_com'))).toBe(true)
    expect(await pathExists(join(sshDir, 'id_ed25519_github_com.pub'))).toBe(
      true,
    )
  })

  it('logs dry-run for SSH key and template dir removal', async () => {
    options = { ...options, dryRun: true }
    const sshDir = join(tempDir, '.ssh')
    await writeFile(join(sshDir, 'id_ed25519_github_com'), 'key')
    await writeFile(join(sshDir, 'id_ed25519_github_com.pub'), 'pub')
    await writeFile(join(tempDir, '.gitconfig'), 'config')

    const templateDir = join(tempDir, '.git_template')
    await mkdir(templateDir, { recursive: true })

    await runCleaner(config, options)

    expect(await pathExists(join(sshDir, 'id_ed25519_github_com'))).toBe(true)
    expect(await pathExists(join(sshDir, 'id_ed25519_github_com.pub'))).toBe(
      true,
    )
    expect(await pathExists(templateDir)).toBe(true)
    expect(await pathExists(join(tempDir, '.gitconfig'))).toBe(true)
  })

  it('unsets git global config keys', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await runCleaner(config, options)

    const unsetCalls = vi
      .mocked(executeCommand)
      .mock.calls.filter(
        call => call[1] === 'git' && (call[2] as string[]).includes('--unset'),
      )
    expect(unsetCalls).toHaveLength(5)
    const unsetKeys = unsetCalls.map(call => (call[2] as string[])[3])
    expect(unsetKeys).toContain('user.signingkey')
    expect(unsetKeys).toContain('gpg.program')
    expect(unsetKeys).toContain('commit.gpgsign')
    expect(unsetKeys).toContain('tag.gpgsign')
    expect(unsetKeys).toContain('init.templatedir')
  })

  it('handles git config unset failure gracefully', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockImplementation(async (_desc, cmd, args) => {
      if (cmd === 'git' && (args as string[]).includes('--unset')) {
        throw new Error('key not set')
      }
      return { stdout: '', stderr: '' }
    })

    await expect(runCleaner(config, options)).resolves.not.toThrow()
  })

  it('removes generated GPG keys by fingerprint', async () => {
    config = {
      ...config,
      generatedGpgFingerprints: ['ABC123', 'DEF456'],
    }

    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await runCleaner(config, options)

    const gpgCalls = vi
      .mocked(executeCommand)
      .mock.calls.filter(
        call =>
          call[1] === 'gpg' &&
          (call[2] as string[]).includes('--delete-secret-and-public-key'),
      )
    expect(gpgCalls).toHaveLength(2)
    expect(gpgCalls[0][2]).toContain('ABC123')
    expect(gpgCalls[1][2]).toContain('DEF456')
  })

  it('skips GPG key removal when no fingerprints stored', async () => {
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await runCleaner(config, options)

    const gpgCalls = vi
      .mocked(executeCommand)
      .mock.calls.filter(
        call =>
          call[1] === 'gpg' &&
          (call[2] as string[]).includes('--delete-secret-and-public-key'),
      )
    expect(gpgCalls).toHaveLength(0)
  })

  it('removes backup files', async () => {
    const sshDir = join(tempDir, '.ssh')
    await writeFile(join(tempDir, '.gitconfig.bak.2025-01-01'), 'bak')
    await writeFile(join(tempDir, '.gitignore_global.bak.2025-03-15'), 'bak')
    await writeFile(join(sshDir, 'config.bak.2025-06-20'), 'bak')

    await runCleaner(config, options)

    expect(await pathExists(join(tempDir, '.gitconfig.bak.2025-01-01'))).toBe(
      false,
    )
    expect(
      await pathExists(join(tempDir, '.gitignore_global.bak.2025-03-15')),
    ).toBe(false)
    expect(await pathExists(join(sshDir, 'config.bak.2025-06-20'))).toBe(false)
  })

  it('removes config directory', async () => {
    const configDir = join(tempDir, '.config', 'git-setup')
    await mkdir(configDir, { recursive: true })
    await writeFile(join(configDir, 'config.json'), '{}')

    await runCleaner(config, options)

    expect(await pathExists(configDir)).toBe(false)
  })

  it('handles missing GPG key gracefully', async () => {
    config = { ...config, generatedGpgFingerprints: ['MISSING'] }

    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockImplementation(async (_desc, cmd, args) => {
      if (
        cmd === 'gpg' &&
        (args as string[]).includes('--delete-secret-and-public-key')
      ) {
        throw new Error('key not found')
      }
      return { stdout: '', stderr: '' }
    })

    await expect(runCleaner(config, options)).resolves.not.toThrow()
  })

  it('dry-run skips git config unset and GPG key deletion', async () => {
    options = { ...options, dryRun: true }
    config = { ...config, generatedGpgFingerprints: ['ABC123'] }

    const configDir = join(tempDir, '.config', 'git-setup')
    await mkdir(configDir, { recursive: true })
    await writeFile(join(configDir, 'config.json'), '{}')

    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await runCleaner(config, options)

    const allCalls = vi.mocked(executeCommand).mock.calls
    for (const call of allCalls) {
      expect(call[3]).toBe(true)
    }
    expect(await pathExists(configDir)).toBe(true)
  })
})
