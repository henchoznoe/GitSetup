/**
 * File: tests/utils/file-block.test.ts
 * Description: Tests for marker-based file block editing
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { updateFileBlock } from '@/utils/file-block.ts'
import { pathExists } from '@/utils/file-ops.ts'

const START = '# START'
const END = '# END'

describe('updateFileBlock', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitsetup-test-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('creates new file with block when file does not exist', async () => {
    const filePath = join(tempDir, 'new.txt')
    await updateFileBlock(filePath, START, END, 'content', false)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toBe(`${START}\ncontent\n${END}\n`)
  })

  it('does nothing when file does not exist and content is empty', async () => {
    const filePath = join(tempDir, 'new.txt')
    await updateFileBlock(filePath, START, END, '', false)

    const exists = await pathExists(filePath)
    expect(exists).toBe(false)
  })

  it('does not create file in dry-run mode', async () => {
    const filePath = join(tempDir, 'new.txt')
    await updateFileBlock(filePath, START, END, 'content', true)

    const exists = await pathExists(filePath)
    expect(exists).toBe(false)
  })

  it('replaces existing block content', async () => {
    const filePath = join(tempDir, 'existing.txt')
    await writeFile(filePath, `before\n${START}\nold content\n${END}\nafter`)

    await updateFileBlock(filePath, START, END, 'new content', false)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('before')
    expect(result).toContain('new content')
    expect(result).toContain('after')
    expect(result).not.toContain('old content')
  })

  it('removes block when content is empty', async () => {
    const filePath = join(tempDir, 'existing.txt')
    await writeFile(filePath, `before\n${START}\nold content\n${END}\nafter`)

    await updateFileBlock(filePath, START, END, '', false)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('before')
    expect(result).toContain('after')
    expect(result).not.toContain(START)
    expect(result).not.toContain(END)
    expect(result).not.toContain('old content')
  })

  it('appends block when markers not found in existing file', async () => {
    const filePath = join(tempDir, 'existing.txt')
    await writeFile(filePath, 'existing content')

    await updateFileBlock(filePath, START, END, 'new block', false)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('existing content')
    expect(result).toContain(START)
    expect(result).toContain('new block')
    expect(result).toContain(END)
  })

  it('does not modify file in dry-run when file exists', async () => {
    const filePath = join(tempDir, 'existing.txt')
    await writeFile(filePath, `before\n${START}\nold\n${END}\nafter`)

    await updateFileBlock(filePath, START, END, 'new', true)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('old')
  })

  it('appends empty line before block if file does not end with empty line', async () => {
    const filePath = join(tempDir, 'notrailing.txt')
    await writeFile(filePath, 'line1\nline2')

    await updateFileBlock(filePath, START, END, 'block', false)

    const result = await readFile(filePath, 'utf-8')
    const lines = result.split('\n')
    const startIdx = lines.indexOf(START)
    expect(startIdx).toBeGreaterThan(0)
    expect(lines[startIdx - 1]).toBe('')
  })

  it('does not add extra empty line when file already ends with one', async () => {
    const filePath = join(tempDir, 'trailing.txt')
    await writeFile(filePath, 'line1\nline2\n')

    await updateFileBlock(filePath, START, END, 'block', false)

    const result = await readFile(filePath, 'utf-8')
    expect(result).toContain('line2')
    expect(result).toContain(START)
    expect(result).toContain('block')
  })
})
