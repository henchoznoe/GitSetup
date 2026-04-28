/**
 * File: tests/core/config.test.ts
 * Description: Tests for configuration loading and validation
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from '@/core/config.ts'

describe('loadConfig', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('loads and parses valid .env file', async () => {
    const envPath = join(tempDir, '.env')
    await writeFile(
      envPath,
      [
        'GIT_USER_NAME="John Doe"',
        'GIT_USER_EMAIL_DEFAULT="john@example.com"',
        'GIT_PROFILES="github.com:john@example.com,gitlab.com:john@work.com"',
        'GIT_CORE_EDITOR="nano"',
        'ENABLE_GPG_SIGNING="true"',
        'GPG_PROGRAM="gpg2"',
        'ENABLE_CONVENTIONAL_COMMITS="false"',
      ].join('\n'),
    )

    const config = await loadConfig(envPath)

    expect(config.gitUserName).toBe('John Doe')
    expect(config.gitUserEmailDefault).toBe('john@example.com')
    expect(config.profiles).toHaveLength(2)
    expect(config.profiles[0]).toEqual({
      host: 'github.com',
      email: 'john@example.com',
    })
    expect(config.profiles[1]).toEqual({
      host: 'gitlab.com',
      email: 'john@work.com',
    })
    expect(config.enableGpgSigning).toBe(true)
    expect(config.gpgProgram).toBe('gpg2')
    expect(config.gitCoreEditor).toBe('nano')
    expect(config.enableConventionalCommits).toBe(false)
  })

  it('uses defaults for optional fields', async () => {
    const envPath = join(tempDir, '.env')
    await writeFile(
      envPath,
      [
        'GIT_USER_NAME="Jane"',
        'GIT_USER_EMAIL_DEFAULT="jane@test.com"',
        'GIT_PROFILES="github.com:jane@test.com"',
        'GIT_CORE_EDITOR="vim"',
      ].join('\n'),
    )

    const config = await loadConfig(envPath)

    expect(config.enableGpgSigning).toBe(false)
    expect(config.gpgProgram).toBe('gpg')
    expect(config.enableConventionalCommits).toBe(true)
  })

  it('throws on missing required field', async () => {
    const envPath = join(tempDir, '.env')
    await writeFile(envPath, 'GIT_USER_NAME="Test"')

    await expect(loadConfig(envPath)).rejects.toThrow()
  })

  it('throws on invalid email', async () => {
    const envPath = join(tempDir, '.env')
    await writeFile(
      envPath,
      [
        'GIT_USER_NAME="Test"',
        'GIT_USER_EMAIL_DEFAULT="not-an-email"',
        'GIT_PROFILES="github.com:test@test.com"',
        'GIT_CORE_EDITOR="vim"',
      ].join('\n'),
    )

    await expect(loadConfig(envPath)).rejects.toThrow()
  })

  it('throws on invalid profile format', async () => {
    const envPath = join(tempDir, '.env')
    await writeFile(
      envPath,
      [
        'GIT_USER_NAME="Test"',
        'GIT_USER_EMAIL_DEFAULT="test@test.com"',
        'GIT_PROFILES="invalid-no-colon"',
        'GIT_CORE_EDITOR="vim"',
      ].join('\n'),
    )

    await expect(loadConfig(envPath)).rejects.toThrow('Invalid profile format')
  })
})
