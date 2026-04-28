/**
 * File: tests/utils/sanitize.test.ts
 * Description: Tests for string sanitization helpers
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { sanitizeHost } from '@/utils/sanitize.ts'

describe('sanitizeHost', () => {
  it('replaces dots with underscores', () => {
    expect(sanitizeHost('github.com')).toBe('github_com')
  })

  it('handles multiple dots', () => {
    expect(sanitizeHost('self.hosted.gitlab.com')).toBe(
      'self_hosted_gitlab_com',
    )
  })

  it('returns unchanged string without dots', () => {
    expect(sanitizeHost('localhost')).toBe('localhost')
  })
})
