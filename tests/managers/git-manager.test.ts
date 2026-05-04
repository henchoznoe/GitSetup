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
  extractGitconfigValue,
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
      aliasOverrides: [],
      generatedGpgFingerprints: [],
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
      aliasOverrides: [],
      generatedGpgFingerprints: [],
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

  it('does not run `git config --global init.templatedir` (now in gitconfig template)', async () => {
    const mockGpgFinder = vi.fn().mockResolvedValue(null)
    const { executeCommand } = await import('@/utils/executor.ts')
    vi.mocked(executeCommand).mockClear()

    await installGitHooks(config, options, mockGpgFinder)

    const gitConfigCalls = vi
      .mocked(executeCommand)
      .mock.calls.filter(
        call => call[1] === 'git' && (call[2] as string[])[0] === 'config',
      )
    expect(gitConfigCalls).toHaveLength(0)
  })
})

describe('configureGitGlobal extras', () => {
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
      aliasOverrides: [],
      generatedGpgFingerprints: [],
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

  it('embeds the templatedir in the [init] section with consistent indentation', async () => {
    await configureGitGlobal(config, options)

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).toMatch(
      /\[init\]\n {4}defaultBranch = main\n {4}templatedir = /,
    )
    expect(content).not.toMatch(/\t/)
  })

  it('embeds GPG signing settings when a primary key is provided', async () => {
    config = { ...config, enableGpgSigning: true, gpgProgram: 'gpg2' }

    await configureGitGlobal(config, options, {
      gpgPrimaryKey: 'BB1DD9C1AC6AD90B',
    })

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).toMatch(
      /\[user\]\n {4}name = .+\n {4}email = .+\n {4}signingkey = BB1DD9C1AC6AD90B/,
    )
    expect(content).toContain('[gpg]\n    program = gpg2')
    expect(content).toContain('[commit]\n    gpgsign = true')
    expect(content).toContain('[tag]\n    gpgsign = true')
    expect(content).not.toMatch(/\t/)
  })

  it('omits GPG signing settings when no primary key is found', async () => {
    config = { ...config, enableGpgSigning: true }

    await configureGitGlobal(config, options, { gpgPrimaryKey: null })

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).not.toContain('signingkey')
    expect(content).not.toContain('[gpg]')
    expect(content).not.toContain('[commit]')
    expect(content).not.toContain('[tag]')
  })

  it('omits GPG signing settings when signing is disabled even if a key id is passed', async () => {
    config = { ...config, enableGpgSigning: false }

    await configureGitGlobal(config, options, { gpgPrimaryKey: 'ABC123' })

    const content = await readFile(join(tempDir, '.gitconfig'), 'utf-8')
    expect(content).not.toContain('signingkey')
    expect(content).not.toContain('[gpg]')
  })
})

describe('extractGitconfigValue', () => {
  it('extracts name from gitconfig content', () => {
    const content = '[user]\n    name = John Doe\n    email = j@e.com'
    expect(extractGitconfigValue(content, 'name')).toBe('John Doe')
  })

  it('extracts email from gitconfig content', () => {
    const content = '[user]\n    name = John\n    email = john@test.com'
    expect(extractGitconfigValue(content, 'email')).toBe('john@test.com')
  })

  it('extracts editor from gitconfig content', () => {
    const content = '[core]\n    editor = code --wait\n    autocrlf = input'
    expect(extractGitconfigValue(content, 'editor')).toBe('code --wait')
  })

  it('returns null when key not found', () => {
    const content = '[user]\n    name = John'
    expect(extractGitconfigValue(content, 'editor')).toBeNull()
  })
})

describe('configureGitGlobal change detection', () => {
  let tempDir: string
  let config: AppConfig
  let options: AppOptions

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-git-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    config = {
      gitUserName: 'New User',
      gitUserEmailDefault: 'new@example.com',
      profiles: [{ host: 'github.com', email: 'gh@test.com' }],
      enableGpgSigning: false,
      gpgProgram: 'gpg',
      gitCoreEditor: 'code',
      enableConventionalCommits: true,
      aliasOverrides: [],
      generatedGpgFingerprints: [],
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

  it('shows changes when values differ', async () => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(
      join(tempDir, '.gitconfig'),
      '[user]\n    name = Old User\n    email = old@test.com\n[core]\n    editor = vim',
    )

    const stdoutWrite = vi.spyOn(process.stdout, 'write')

    await configureGitGlobal(config, options)

    const output = stdoutWrite.mock.calls.map(c => String(c[0])).join('')
    expect(output).toContain('name: Old User → New User')
    expect(output).toContain('email: old@test.com → new@example.com')
    expect(output).toContain('editor: vim → code')
  })

  it('shows no-change message when values are same', async () => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(
      join(tempDir, '.gitconfig'),
      '[user]\n    name = New User\n    email = new@example.com\n[core]\n    editor = code',
    )

    const stdoutWrite = vi.spyOn(process.stdout, 'write')

    await configureGitGlobal(config, options)

    const output = stdoutWrite.mock.calls.map(c => String(c[0])).join('')
    expect(output).toContain('No value changes detected')
  })
})
