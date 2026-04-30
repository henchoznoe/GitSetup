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
})
