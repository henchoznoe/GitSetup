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
