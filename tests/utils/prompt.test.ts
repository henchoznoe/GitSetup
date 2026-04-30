/**
 * File: tests/utils/prompt.test.ts
 * Description: Tests for interactive prompt utilities
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as clack from '@clack/prompts'
import { confirmAction, selectOption, textInput } from '@/utils/prompt.ts'

vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  text: vi.fn(),
  select: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
}))

describe('confirmAction', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.mocked(clack.isCancel).mockReturnValue(false)
  })

  it('returns true immediately when assumeYes is true', async () => {
    const result = await confirmAction('Proceed?', true)
    expect(result).toBe(true)
    expect(clack.confirm).not.toHaveBeenCalled()
  })

  it('returns true when user confirms', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(true)
    const result = await confirmAction('Proceed?', false)
    expect(result).toBe(true)
  })

  it('returns false when user declines', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(false)
    const result = await confirmAction('Proceed?', false)
    expect(result).toBe(false)
  })

  it('exits on cancellation', async () => {
    vi.mocked(clack.isCancel).mockReturnValue(true)
    vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel') as never)

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never)

    await confirmAction('Proceed?', false)
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})

describe('textInput', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.mocked(clack.isCancel).mockReturnValue(false)
  })

  it('returns user input', async () => {
    vi.mocked(clack.text).mockResolvedValue('hello')
    const result = await textInput('Name?')
    expect(result).toBe('hello')
  })

  it('exits on cancellation', async () => {
    vi.mocked(clack.isCancel).mockReturnValue(true)
    vi.mocked(clack.text).mockResolvedValue(Symbol('cancel') as never)

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never)

    await textInput('Name?')
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})

describe('selectOption', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.mocked(clack.isCancel).mockReturnValue(false)
  })

  it('returns selected value', async () => {
    vi.mocked(clack.select).mockResolvedValue('vim')
    const result = await selectOption('Editor?', [
      { value: 'nano', label: 'nano' },
      { value: 'vim', label: 'vim' },
    ])
    expect(result).toBe('vim')
  })

  it('exits on cancellation', async () => {
    vi.mocked(clack.isCancel).mockReturnValue(true)
    vi.mocked(clack.select).mockResolvedValue(Symbol('cancel') as never)

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never)

    await selectOption('Editor?', [{ value: 'nano' }])
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})
