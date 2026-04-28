/**
 * File: tests/templates/hooks.test.ts
 * Description: Tests for hook script generators
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { HOOK_SIGNATURE } from '@/core/constants.ts'
import {
  renderConventionalCommitHook,
  renderIdentitySwitchHook,
} from '@/templates/hooks.ts'

describe('renderIdentitySwitchHook', () => {
  it('generates bash script with shebang', () => {
    const result = renderIdentitySwitchHook(
      [{ host: 'github.com', email: 'test@github.com' }],
      'default@test.com',
    )

    expect(result).toContain('#!/bin/bash')
  })

  it('includes hook signature', () => {
    const result = renderIdentitySwitchHook(
      [{ host: 'github.com', email: 'test@github.com' }],
      'default@test.com',
    )

    expect(result).toContain(HOOK_SIGNATURE)
  })

  it('generates case entries for each profile', () => {
    const result = renderIdentitySwitchHook(
      [
        { host: 'github.com', email: 'gh@test.com' },
        { host: 'gitlab.com', email: 'gl@test.com' },
      ],
      'default@test.com',
    )

    expect(result).toContain('"github.com"')
    expect(result).toContain('gh@test.com')
    expect(result).toContain('"gitlab.com"')
    expect(result).toContain('gl@test.com')
  })

  it('includes default case with default email', () => {
    const result = renderIdentitySwitchHook(
      [{ host: 'github.com', email: 'gh@test.com' }],
      'fallback@test.com',
    )

    expect(result).toContain('fallback@test.com')
    expect(result).toContain('Using default')
  })

  it('includes GPG signing key when provided', () => {
    const result = renderIdentitySwitchHook(
      [{ host: 'github.com', email: 'gh@test.com', gpgKeyId: 'ABC123' }],
      'default@test.com',
    )

    expect(result).toContain('signingkey')
    expect(result).toContain('ABC123')
  })

  it('omits GPG signing when no key provided', () => {
    const result = renderIdentitySwitchHook(
      [{ host: 'github.com', email: 'gh@test.com' }],
      'default@test.com',
    )

    expect(result).not.toContain('signingkey')
  })

  it('checks remote URL before switching', () => {
    const result = renderIdentitySwitchHook(
      [{ host: 'github.com', email: 'gh@test.com' }],
      'default@test.com',
    )

    expect(result).toContain('git remote get-url origin')
    expect(result).toContain('exit 0')
  })
})

describe('renderConventionalCommitHook', () => {
  it('generates bash script with shebang', () => {
    const result = renderConventionalCommitHook()
    expect(result).toContain('#!/bin/bash')
  })

  it('includes hook signature', () => {
    const result = renderConventionalCommitHook()
    expect(result).toContain(HOOK_SIGNATURE)
  })

  it('validates against conventional commit pattern', () => {
    const result = renderConventionalCommitHook()
    expect(result).toContain('feat')
    expect(result).toContain('fix')
    expect(result).toContain('grep')
  })

  it('shows error message and examples on failure', () => {
    const result = renderConventionalCommitHook()
    expect(result).toContain('Invalid commit message')
    expect(result).toContain('exit 1')
  })
})
