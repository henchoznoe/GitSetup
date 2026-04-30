/**
 * File: tests/utils/spinner.test.ts
 * Description: Tests for spinner utility
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import * as clack from '@clack/prompts'
import { withSpinner } from '@/utils/spinner.ts'

vi.mock('@clack/prompts', () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('withSpinner', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls start and stop on success', async () => {
    const mockSpinner = { start: vi.fn(), stop: vi.fn(), error: vi.fn() }
    vi.mocked(clack.spinner).mockReturnValue(mockSpinner as never)

    const result = await withSpinner('Loading...', 'Done!', async () => 42)

    expect(result).toBe(42)
    expect(mockSpinner.start).toHaveBeenCalledWith('Loading...')
    expect(mockSpinner.stop).toHaveBeenCalledWith('Done!')
    expect(mockSpinner.error).not.toHaveBeenCalled()
  })

  it('calls error and re-throws on failure', async () => {
    const mockSpinner = { start: vi.fn(), stop: vi.fn(), error: vi.fn() }
    vi.mocked(clack.spinner).mockReturnValue(mockSpinner as never)

    const error = new Error('boom')
    await expect(
      withSpinner('Loading...', 'Done!', async () => {
        throw error
      }),
    ).rejects.toThrow('boom')

    expect(mockSpinner.start).toHaveBeenCalledWith('Loading...')
    expect(mockSpinner.error).toHaveBeenCalledWith('Loading...')
    expect(mockSpinner.stop).not.toHaveBeenCalled()
  })
})
