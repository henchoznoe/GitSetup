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
