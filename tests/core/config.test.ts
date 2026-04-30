/**
 * File: tests/core/config.test.ts
 * Description: Tests for JSON configuration loading, saving, and validation
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  configExists,
  getConfigPath,
  loadJsonConfig,
  recordGeneratedGpgKey,
  resolveConfig,
  saveConfig,
  toAppConfig,
} from '@/core/config.ts'
import type { JsonConfig } from '@/core/types.ts'
import { writeFileSafe } from '@/utils/file-ops.ts'

const validConfig: JsonConfig = {
  version: 1,
  user: { name: 'John Doe', defaultEmail: 'john@example.com' },
  profiles: [
    { host: 'github.com', email: 'john@example.com' },
    { host: 'gitlab.com', email: 'john@work.com' },
  ],
  editor: 'nano',
  gpg: { enabled: true, program: 'gpg2', generatedKeys: [] },
  hooks: { conventionalCommits: false },
}

describe('configExists', () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('returns false when no config file exists', async () => {
    expect(await configExists()).toBe(false)
  })

  it('returns true when config file exists', async () => {
    await saveConfig(validConfig)
    expect(await configExists()).toBe(true)
  })
})

describe('loadJsonConfig', () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('loads and parses valid config', async () => {
    await saveConfig(validConfig)
    const loaded = await loadJsonConfig()

    expect(loaded.version).toBe(1)
    expect(loaded.user.name).toBe('John Doe')
    expect(loaded.user.defaultEmail).toBe('john@example.com')
    expect(loaded.profiles).toHaveLength(2)
    expect(loaded.profiles[0]).toEqual({
      host: 'github.com',
      email: 'john@example.com',
    })
    expect(loaded.editor).toBe('nano')
    expect(loaded.gpg.enabled).toBe(true)
    expect(loaded.gpg.program).toBe('gpg2')
    expect(loaded.hooks.conventionalCommits).toBe(false)
  })

  it('throws on invalid JSON', async () => {
    const configPath = getConfigPath()
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(tempDir, '.config', 'git-setup'), { recursive: true })
    await writeFileSafe(configPath, 'not json', undefined, false)

    await expect(loadJsonConfig()).rejects.toThrow()
  })

  it('throws on invalid schema', async () => {
    const configPath = getConfigPath()
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(tempDir, '.config', 'git-setup'), { recursive: true })
    await writeFileSafe(
      configPath,
      JSON.stringify({ version: 1 }),
      undefined,
      false,
    )

    await expect(loadJsonConfig()).rejects.toThrow()
  })
})

describe('saveConfig', () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('saves config as formatted JSON', async () => {
    await saveConfig(validConfig)
    const content = await readFile(getConfigPath(), 'utf-8')
    const parsed = JSON.parse(content)

    expect(parsed.version).toBe(1)
    expect(parsed.user.name).toBe('John Doe')
    expect(content).toContain('\n')
  })

  it('throws on invalid config', async () => {
    const invalid = { ...validConfig, version: 2 } as unknown as JsonConfig
    await expect(saveConfig(invalid)).rejects.toThrow()
  })

  it('throws when profiles array is empty', async () => {
    const invalid = { ...validConfig, profiles: [] } as unknown as JsonConfig
    await expect(saveConfig(invalid)).rejects.toThrow()
  })
})

describe('toAppConfig', () => {
  it('converts JsonConfig to AppConfig', () => {
    const app = toAppConfig(validConfig)

    expect(app.gitUserName).toBe('John Doe')
    expect(app.gitUserEmailDefault).toBe('john@example.com')
    expect(app.profiles).toHaveLength(2)
    expect(app.enableGpgSigning).toBe(true)
    expect(app.gpgProgram).toBe('gpg2')
    expect(app.gitCoreEditor).toBe('nano')
    expect(app.enableConventionalCommits).toBe(false)
  })

  it('defaults generatedGpgFingerprints to empty array', () => {
    const app = toAppConfig(validConfig)
    expect(app.generatedGpgFingerprints).toEqual([])
  })

  it('maps generatedKeys fingerprints to AppConfig', () => {
    const configWithKeys: JsonConfig = {
      ...validConfig,
      gpg: {
        ...validConfig.gpg,
        generatedKeys: [{ email: 'a@b.com', fingerprint: 'ABCD1234' }],
      },
    }
    const app = toAppConfig(configWithKeys)
    expect(app.generatedGpgFingerprints).toEqual(['ABCD1234'])
  })
})

describe('recordGeneratedGpgKey', () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('appends a GPG key fingerprint to config', async () => {
    await saveConfig(validConfig)

    await recordGeneratedGpgKey('john@example.com', 'ABCDEF12')

    const loaded = await loadJsonConfig()
    expect(loaded.gpg.generatedKeys).toEqual([
      { email: 'john@example.com', fingerprint: 'ABCDEF12' },
    ])
  })

  it('does not duplicate existing fingerprints', async () => {
    await saveConfig(validConfig)

    await recordGeneratedGpgKey('john@example.com', 'ABCDEF12')
    await recordGeneratedGpgKey('john@example.com', 'ABCDEF12')

    const loaded = await loadJsonConfig()
    expect(loaded.gpg.generatedKeys).toHaveLength(1)
  })

  it('appends multiple different fingerprints', async () => {
    await saveConfig(validConfig)

    await recordGeneratedGpgKey('john@example.com', 'KEY1')
    await recordGeneratedGpgKey('jane@example.com', 'KEY2')

    const loaded = await loadJsonConfig()
    expect(loaded.gpg.generatedKeys).toHaveLength(2)
  })
})

describe('resolveConfig', () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    originalHome = process.env.HOME
    process.env.HOME = tempDir
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('returns null when no config exists', async () => {
    const result = await resolveConfig()
    expect(result).toBeNull()
  })

  it('returns AppConfig when config exists', async () => {
    await saveConfig(validConfig)
    const result = await resolveConfig()

    expect(result).not.toBeNull()
    expect(result?.gitUserName).toBe('John Doe')
    expect(result?.profiles).toHaveLength(2)
  })
})
