/**
 * File: tests/utils/file-ops.test.ts
 * Description: Tests for file system operations
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  backupFile,
  ensureDirectory,
  homePath,
  parseEnvFile,
  pathExists,
  writeFileSafe,
} from '@/utils/file-ops.ts'

describe('pathExists', () => {
  it('returns true for existing file', async () => {
    const result = await pathExists(import.meta.filename)
    expect(result).toBe(true)
  })

  it('returns false for non-existing file', async () => {
    const result = await pathExists('/nonexistent/path/xyz')
    expect(result).toBe(false)
  })
})

describe('backupFile', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('returns null when file does not exist', async () => {
    const result = await backupFile(join(tempDir, 'missing'), false)
    expect(result).toBeNull()
  })

  it('creates backup in non-dry-run mode', async () => {
    const filePath = join(tempDir, 'test.txt')
    await writeFile(filePath, 'content')

    const backupPath = await backupFile(filePath, false)
    expect(backupPath).not.toBeNull()
    expect(backupPath).toContain('.bak.')

    const backupContent = await readFile(backupPath as string, 'utf-8')
    expect(backupContent).toBe('content')
  })

  it('returns path without creating file in dry-run mode', async () => {
    const filePath = join(tempDir, 'test.txt')
    await writeFile(filePath, 'content')

    const backupPath = await backupFile(filePath, true)
    expect(backupPath).toContain('.bak.')

    const backupExists = await pathExists(backupPath as string)
    expect(backupExists).toBe(false)
  })
})

describe('ensureDirectory', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('creates directory in non-dry-run mode', async () => {
    const dirPath = join(tempDir, 'newdir')
    await ensureDirectory(dirPath, 0o755, false)

    const exists = await pathExists(dirPath)
    expect(exists).toBe(true)
  })

  it('does not create directory in dry-run mode when not existing', async () => {
    const dirPath = join(tempDir, 'newdir')
    await ensureDirectory(dirPath, 0o755, true)

    const exists = await pathExists(dirPath)
    expect(exists).toBe(false)
  })

  it('does not log in dry-run mode when directory already exists', async () => {
    const stdoutWrite = vi.spyOn(process.stdout, 'write')
    await ensureDirectory(tempDir, 0o755, true)

    const output = stdoutWrite.mock.calls.map(c => String(c[0])).join('')
    expect(output).not.toContain('Would create directory')
  })
})

describe('writeFileSafe', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('writes file atomically', async () => {
    const filePath = join(tempDir, 'output.txt')
    await writeFileSafe(filePath, 'hello world', undefined, false)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe('hello world')
  })

  it('writes file with specified permissions', async () => {
    const filePath = join(tempDir, 'secured.txt')
    await writeFileSafe(filePath, 'secret', 0o600, false)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe('secret')
  })

  it('does not write file in dry-run mode', async () => {
    const filePath = join(tempDir, 'output.txt')
    await writeFileSafe(filePath, 'hello', undefined, true)

    const exists = await pathExists(filePath)
    expect(exists).toBe(false)
  })
})

describe('parseEnvFile', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('returns empty object when file does not exist', async () => {
    const result = await parseEnvFile(join(tempDir, 'missing'))
    expect(result).toEqual({})
  })

  it('parses key-value pairs', async () => {
    const filePath = join(tempDir, '.env')
    await writeFile(filePath, 'KEY=value\nOTHER=data')

    const result = await parseEnvFile(filePath)
    expect(result).toEqual({ KEY: 'value', OTHER: 'data' })
  })

  it('handles double-quoted values', async () => {
    const filePath = join(tempDir, '.env')
    await writeFile(filePath, 'NAME="John Doe"')

    const result = await parseEnvFile(filePath)
    expect(result).toEqual({ NAME: 'John Doe' })
  })

  it('handles single-quoted values', async () => {
    const filePath = join(tempDir, '.env')
    await writeFile(filePath, "NAME='Jane Doe'")

    const result = await parseEnvFile(filePath)
    expect(result).toEqual({ NAME: 'Jane Doe' })
  })

  it('skips comments and empty lines', async () => {
    const filePath = join(tempDir, '.env')
    await writeFile(filePath, '# comment\n\nKEY=value\n# another\n')

    const result = await parseEnvFile(filePath)
    expect(result).toEqual({ KEY: 'value' })
  })

  it('skips lines without equals sign', async () => {
    const filePath = join(tempDir, '.env')
    await writeFile(filePath, 'VALID=yes\ninvalid_line\nOTHER=ok')

    const result = await parseEnvFile(filePath)
    expect(result).toEqual({ VALID: 'yes', OTHER: 'ok' })
  })

  it('handles values with equals signs', async () => {
    const filePath = join(tempDir, '.env')
    await writeFile(filePath, 'URL=postgres://user:pass@host/db?opt=1')

    const result = await parseEnvFile(filePath)
    expect(result).toEqual({ URL: 'postgres://user:pass@host/db?opt=1' })
  })
})

describe('homePath', () => {
  it('builds path relative to HOME', () => {
    const originalHome = process.env.HOME
    process.env.HOME = '/Users/test'

    const result = homePath('.ssh', 'config')
    expect(result).toBe('/Users/test/.ssh/config')

    process.env.HOME = originalHome
  })

  it('throws when HOME is not set', () => {
    const originalHome = process.env.HOME
    delete process.env.HOME

    expect(() => homePath('.ssh')).toThrow(
      'HOME environment variable is not set',
    )

    process.env.HOME = originalHome
  })
})
