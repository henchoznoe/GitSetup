/**
 * File: tests/utils/sanitize.test.ts
 * Description: Tests for string sanitization helpers
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { getSshKeyUrl, sanitizeHost } from '@/utils/sanitize.ts'

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

describe('getSshKeyUrl', () => {
  it('returns GitHub URL for github.com', () => {
    expect(getSshKeyUrl('github.com')).toBe(
      'https://github.com/settings/ssh/new',
    )
  })

  it('returns GitLab URL for gitlab.com', () => {
    expect(getSshKeyUrl('gitlab.com')).toBe(
      'https://gitlab.com/-/user_settings/ssh_keys',
    )
  })

  it('returns Bitbucket URL for bitbucket.org', () => {
    expect(getSshKeyUrl('bitbucket.org')).toBe(
      'https://bitbucket.org/account/settings/ssh-keys/',
    )
  })

  it('returns Codeberg URL for codeberg.org', () => {
    expect(getSshKeyUrl('codeberg.org')).toBe(
      'https://codeberg.org/user/settings/keys',
    )
  })

  it('infers GitLab URL for self-hosted gitlab instances', () => {
    expect(getSshKeyUrl('gitlab.company.com')).toBe(
      'https://gitlab.company.com/-/user_settings/ssh_keys',
    )
  })

  it('infers Gitea URL for gitea instances', () => {
    expect(getSshKeyUrl('gitea.internal.org')).toBe(
      'https://gitea.internal.org/user/settings/keys',
    )
  })

  it('returns null for unknown hosts', () => {
    expect(getSshKeyUrl('custom-git.example.com')).toBeNull()
  })
})
