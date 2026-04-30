/**
 * File: tests/managers/git-manager.test.ts
 * Description: Tests for git configuration and hook installation
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AppConfig, AppOptions } from '@/core/types.ts'
import {
  configureGitGlobal,
  configureGitIgnore,
  installGitHooks,
} from '@/managers/git-manager.ts'
import { pathExists } from '@/utils/file-ops.ts'

vi.mock('@/utils/executor.ts', () => ({
  executeCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}))

vi.mock('@/utils/prompt.ts', () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/utils/spinner.ts', () => ({
  withSpinner: vi.fn((_start, _stop, task) => task()),
}))

describe('configureGitGlobal', () => {
  let tempDir: string
  let config: AppConfig
  let options: AppOptions

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-git-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    config = {
      gitUserName: 'Test User',
      gitUserEmailDefault: 'test@example.com',
      profiles: [{ host: 'github.com', email: 'gh@test.com' }],
      enableGpgSigning: false,
      gpgProgram: 'gpg',
      gitCoreEditor: 'vim',
      enableConventionalCommits: true,
    }

    options = {
      dryRun: false,
      assumeYes: true,
      verbose: false,
      sshDir: tempDir,
    }

    process.env.HOME = tempDir
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('writes gitconfig file with user info', async () => {
    await configureGitGlobal(config, options)

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).toContain('name = Test User')
    expect(content).toContain('email = test@example.com')
    expect(content).toContain('editor = vim')
  })

  it('skips when user declines overwrite and returns skip summary', async () => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(tempDir, '.gitconfig'), 'existing')

    const { confirmAction } = await import('@/utils/prompt.ts')
    vi.mocked(confirmAction).mockResolvedValue(false)

    const result = await configureGitGlobal(config, options)

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).toBe('existing')
    expect(result).toContain('Skipped')
  })

  it('backs up existing file when user confirms overwrite', async () => {
    const { writeFile: fsWriteFile } = await import('node:fs/promises')
    await fsWriteFile(join(tempDir, '.gitconfig'), 'old content')

    const { confirmAction } = await import('@/utils/prompt.ts')
    vi.mocked(confirmAction).mockResolvedValue(true)

    await configureGitGlobal(config, options)

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).toContain('name = Test User')
  })

  it('does not write in dry-run mode and returns "Would create"', async () => {
    options = { ...options, dryRun: true }

    const result = await configureGitGlobal(config, options)

    const exists = await pathExists(join(tempDir, '.gitconfig'))
    expect(exists).toBe(false)
    expect(result).toBe('Would create .gitconfig')
  })

  it('returns "Would overwrite" in dry-run when file exists', async () => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(tempDir, '.gitconfig'), 'existing')
    options = { ...options, dryRun: true }

    const result = await configureGitGlobal(config, options)
    expect(result).toBe('Would overwrite .gitconfig')
  })
})

describe('configureGitIgnore', () => {
  let tempDir: string
  let options: AppOptions

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-git-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    options = {
      dryRun: false,
      assumeYes: true,
      verbose: false,
      sshDir: tempDir,
    }

    process.env.HOME = tempDir
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('writes gitignore_global file and returns summary', async () => {
    const result = await configureGitIgnore(options)

    const content = await readFile(join(tempDir, '.gitignore_global'), 'utf-8')
    expect(content).toContain('.DS_Store')
    expect(content).toContain('node_modules/')
    expect(result).toBe('Wrote .gitignore_global')
  })

  it('skips when user declines overwrite and returns skip summary', async () => {
    const { writeFile: fsWriteFile } = await import('node:fs/promises')
    await fsWriteFile(join(tempDir, '.gitignore_global'), 'existing')

    const { confirmAction } = await import('@/utils/prompt.ts')
    vi.mocked(confirmAction).mockResolvedValue(false)

    const result = await configureGitIgnore(options)

    const content = await readFile(join(tempDir, '.gitignore_global'), 'utf-8')
    expect(content).toBe('existing')
    expect(result).toContain('Skipped')
  })

  it('backs up existing file when user confirms overwrite', async () => {
    const { writeFile: fsWriteFile } = await import('node:fs/promises')
    await fsWriteFile(join(tempDir, '.gitignore_global'), 'old')

    const { confirmAction } = await import('@/utils/prompt.ts')
    vi.mocked(confirmAction).mockResolvedValue(true)

    await configureGitIgnore(options)

    const content = await readFile(join(tempDir, '.gitignore_global'), 'utf-8')
    expect(content).toContain('.DS_Store')
  })

  it('returns "Would overwrite" in dry-run when file exists', async () => {
    const { writeFile: fsWriteFile } = await import('node:fs/promises')
    await fsWriteFile(join(tempDir, '.gitignore_global'), 'existing')
    options = { ...options, dryRun: true }

    const result = await configureGitIgnore(options)
    expect(result).toBe('Would overwrite .gitignore_global')
  })

  it('returns "Would create" in dry-run when file does not exist', async () => {
    options = { ...options, dryRun: true }

    const result = await configureGitIgnore(options)
    expect(result).toBe('Would create .gitignore_global')
  })
})

describe('installGitHooks', () => {
  let tempDir: string
  let config: AppConfig
  let options: AppOptions

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-git-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    config = {
      gitUserName: 'Test User',
      gitUserEmailDefault: 'test@example.com',
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
      sshDir: tempDir,
    }

    process.env.HOME = tempDir
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('creates hook files in template directory', async () => {
    const mockGpgFinder = vi.fn().mockResolvedValue(null)

    await installGitHooks(config, options, mockGpgFinder)

    const hooksDir = join(tempDir, '.git_template', 'hooks')
    expect(await pathExists(join(hooksDir, 'post-checkout'))).toBe(true)
    expect(await pathExists(join(hooksDir, 'post-commit'))).toBe(true)
    expect(await pathExists(join(hooksDir, 'post-merge'))).toBe(true)
  })

  it('creates commit-msg hook and returns 4 hooks summary', async () => {
    const mockGpgFinder = vi.fn().mockResolvedValue(null)

    const result = await installGitHooks(config, options, mockGpgFinder)

    const hookPath = join(tempDir, '.git_template', 'hooks', 'commit-msg')
    expect(await pathExists(hookPath)).toBe(true)
    const content = await readFile(hookPath, 'utf-8')
    expect(content).toContain('Conventional Commits')
    expect(result).toBe('Installed 4 hook(s)')
  })

  it('returns 3 hooks summary when conventional commits disabled', async () => {
    config = { ...config, enableConventionalCommits: false }
    const mockGpgFinder = vi.fn().mockResolvedValue(null)

    const result = await installGitHooks(config, options, mockGpgFinder)
    expect(result).toBe('Installed 3 hook(s)')

    const hookPath = join(tempDir, '.git_template', 'hooks', 'commit-msg')
    expect(await pathExists(hookPath)).toBe(false)
  })

  it('returns "Would install" in dry-run mode', async () => {
    options = { ...options, dryRun: true }
    const mockGpgFinder = vi.fn().mockResolvedValue(null)

    const result = await installGitHooks(config, options, mockGpgFinder)
    expect(result).toBe('Would install 4 hook(s)')
  })

  it('calls GPG key finder when signing enabled', async () => {
    config = { ...config, enableGpgSigning: true }
    const mockGpgFinder = vi.fn().mockResolvedValue('ABCDEF12')

    await installGitHooks(config, options, mockGpgFinder)

    expect(mockGpgFinder).toHaveBeenCalledWith('gh@test.com')

    const hookPath = join(tempDir, '.git_template', 'hooks', 'post-checkout')
    const content = await readFile(hookPath, 'utf-8')
    expect(content).toContain('signingkey')
    expect(content).toContain('ABCDEF12')
  })

  it('handles null GPG key gracefully', async () => {
    config = { ...config, enableGpgSigning: true }
    const mockGpgFinder = vi.fn().mockResolvedValue(null)

    await installGitHooks(config, options, mockGpgFinder)

    const hookPath = join(tempDir, '.git_template', 'hooks', 'post-checkout')
    const content = await readFile(hookPath, 'utf-8')
    expect(content).not.toContain('signingkey')
  })

  it('sets git template directory', async () => {
    const mockGpgFinder = vi.fn().mockResolvedValue(null)
    const { executeCommand } = await import('@/utils/executor.ts')

    await installGitHooks(config, options, mockGpgFinder)

    expect(executeCommand).toHaveBeenCalledWith(
      'Set git template directory',
      'git',
      expect.arrayContaining(['config', '--global', 'init.templatedir']),
      false,
    )
  })
})
