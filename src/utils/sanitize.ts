/**
 * File: src/utils/sanitize.ts
 * Description: String sanitization helpers
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

/** Converts dots in a hostname to underscores for safe use in filenames. */
export function sanitizeHost(host: string): string {
  return host.replaceAll('.', '_')
}

const SSH_KEY_URLS: Record<string, string> = {
  'github.com': 'https://github.com/settings/ssh/new',
  'gitlab.com': 'https://gitlab.com/-/user_settings/ssh_keys',
  'bitbucket.org': 'https://bitbucket.org/account/settings/ssh-keys/',
  'codeberg.org': 'https://codeberg.org/user/settings/keys',
}

/** Returns the SSH key settings URL for a known host, or null for unknown hosts. */
export function getSshKeyUrl(host: string): string | null {
  if (SSH_KEY_URLS[host]) return SSH_KEY_URLS[host]
  if (host.includes('gitlab')) return `https://${host}/-/user_settings/ssh_keys`
  if (host.includes('gitea')) return `https://${host}/user/settings/keys`
  return null
}

const HOSTNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates a hostname-style string (e.g. github.com). Returns an error message
 * when the value is invalid, otherwise null.
 */
export function validateHostInput(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'Host is required'
  if (trimmed.includes('://')) {
    return 'Host must not include a URL scheme (use github.com, not https://github.com)'
  }
  if (/\s/.test(trimmed)) return 'Host must not contain whitespace'
  if (!HOSTNAME_PATTERN.test(trimmed)) {
    return 'Host must contain only letters, digits, dots, or hyphens'
  }
  return null
}

/**
 * Validates an email address. Returns an error message when the value is
 * invalid, otherwise null.
 */
export function validateEmailInput(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'Email is required'
  if (!EMAIL_PATTERN.test(trimmed)) return 'A valid email is required'
  return null
}
