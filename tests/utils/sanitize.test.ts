/**
 * File: tests/utils/sanitize.test.ts
 * Description: Tests for string sanitization helpers
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import {
  getSshKeyUrl,
  sanitizeHost,
  validateEmailInput,
  validateHostInput,
} from '@/utils/sanitize.ts'

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

describe('validateHostInput', () => {
  it('accepts a valid hostname', () => {
    expect(validateHostInput('github.com')).toBeNull()
    expect(validateHostInput('gitlab.company.com')).toBeNull()
    expect(validateHostInput('git.example-host.io')).toBeNull()
  })

  it('rejects empty or whitespace-only input', () => {
    expect(validateHostInput('')).toBe('Host is required')
    expect(validateHostInput('   ')).toBe('Host is required')
  })

  it('rejects URL schemes', () => {
    expect(validateHostInput('https://github.com')).toMatch(/URL scheme/)
    expect(validateHostInput('git@github.com')).not.toBeNull()
  })

  it('rejects whitespace inside the host', () => {
    expect(validateHostInput('git hub.com')).toMatch(/whitespace/)
  })

  it('rejects invalid characters', () => {
    expect(validateHostInput('github.com/foo')).not.toBeNull()
    expect(validateHostInput('-github.com')).not.toBeNull()
    expect(validateHostInput('github.com-')).not.toBeNull()
  })
})

describe('validateEmailInput', () => {
  it('accepts a typical email', () => {
    expect(validateEmailInput('user@example.com')).toBeNull()
    expect(validateEmailInput('first.last+tag@sub.example.co')).toBeNull()
  })

  it('rejects empty input', () => {
    expect(validateEmailInput('')).toBe('Email is required')
  })

  it('rejects values without an @', () => {
    expect(validateEmailInput('not-an-email')).toBe('A valid email is required')
  })

  it('rejects values without a domain TLD', () => {
    expect(validateEmailInput('user@example')).toBe('A valid email is required')
  })

  it('rejects values with whitespace', () => {
    expect(validateEmailInput('user @example.com')).toBe(
      'A valid email is required',
    )
  })
})
