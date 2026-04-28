/**
 * File: src/core/config.ts
 * Description: Environment file loading, Zod validation, and profile parsing
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { z } from 'zod'
import { parseEnvFile } from '../utils/file-ops.ts'
import type { AppConfig, Profile } from './types.ts'

const envSchema = z.object({
  GIT_USER_NAME: z.string().min(1, 'GIT_USER_NAME is required'),
  GIT_USER_EMAIL_DEFAULT: z.email(
    'GIT_USER_EMAIL_DEFAULT must be a valid email',
  ),
  GIT_PROFILES: z.string().min(1, 'GIT_PROFILES is required'),
  GIT_CORE_EDITOR: z.string().min(1, 'GIT_CORE_EDITOR is required'),
  ENABLE_GPG_SIGNING: z.enum(['true', 'false']).default('false'),
  GPG_PROGRAM: z.string().default('gpg'),
  ENABLE_CONVENTIONAL_COMMITS: z.enum(['true', 'false']).default('true'),
})

/** Parses a profiles string ("host:email,host:email") into Profile objects. */
function parseProfiles(raw: string): Profile[] {
  return raw.split(',').map(entry => {
    const trimmed = entry.trim()
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) {
      throw new Error(
        `Invalid profile format: "${trimmed}". Expected "host:email"`,
      )
    }
    return {
      host: trimmed.slice(0, colonIndex).trim(),
      email: trimmed.slice(colonIndex + 1).trim(),
    }
  })
}

/** Loads and validates the .env configuration file. */
export async function loadConfig(envFilePath: string): Promise<AppConfig> {
  const raw = await parseEnvFile(envFilePath)
  const parsed = envSchema.parse(raw)

  return {
    gitUserName: parsed.GIT_USER_NAME,
    gitUserEmailDefault: parsed.GIT_USER_EMAIL_DEFAULT,
    profiles: parseProfiles(parsed.GIT_PROFILES),
    enableGpgSigning: parsed.ENABLE_GPG_SIGNING === 'true',
    gpgProgram: parsed.GPG_PROGRAM,
    gitCoreEditor: parsed.GIT_CORE_EDITOR,
    enableConventionalCommits: parsed.ENABLE_CONVENTIONAL_COMMITS === 'true',
  }
}
