/**
 * File: src/core/config.ts
 * Description: Configuration loading, validation, and persistence (JSON + legacy .env)
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import {
  ensureDirectory,
  homePath,
  parseEnvFile,
  pathExists,
  writeFileSafe,
} from '../utils/file-ops.ts'
import { CONFIG_DIR, CONFIG_FILE, LEGACY_ENV_FILE } from './constants.ts'
import type { AppConfig, JsonConfig, Profile } from './types.ts'

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

const profileSchema = z.object({
  host: z.string().min(1),
  email: z.email(),
})

const jsonConfigSchema = z.object({
  version: z.literal(1),
  user: z.object({
    name: z.string().min(1),
    defaultEmail: z.email(),
  }),
  profiles: z.array(profileSchema).min(1),
  editor: z.string().min(1),
  gpg: z.object({
    enabled: z.boolean().default(false),
    program: z.string().default('gpg'),
  }),
  hooks: z.object({
    conventionalCommits: z.boolean().default(true),
  }),
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

/** Loads and validates a legacy .env configuration file. */
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

/** Returns the full path to the JSON config file. */
export function getConfigPath(): string {
  return homePath(CONFIG_DIR, CONFIG_FILE)
}

/** Returns the full path to the config directory. */
function getConfigDir(): string {
  return homePath(CONFIG_DIR)
}

/** Returns the full path to the legacy .env config file. */
export function getLegacyEnvPath(): string {
  return homePath(CONFIG_DIR, LEGACY_ENV_FILE)
}

/** Checks whether a JSON config file exists. */
export async function configExists(): Promise<boolean> {
  return pathExists(getConfigPath())
}

/** Loads and validates the JSON config file. */
export async function loadJsonConfig(): Promise<JsonConfig> {
  const configPath = getConfigPath()
  const content = await readFile(configPath, 'utf-8')
  const raw = JSON.parse(content)
  return jsonConfigSchema.parse(raw)
}

/** Saves a validated JsonConfig to disk. */
export async function saveConfig(config: JsonConfig): Promise<void> {
  jsonConfigSchema.parse(config)
  const configDir = getConfigDir()
  await ensureDirectory(configDir, 0o755, false)
  const content = `${JSON.stringify(config, null, 2)}\n`
  await writeFileSafe(getConfigPath(), content, 0o644, false)
}

/** Converts a JsonConfig to the AppConfig interface used by managers. */
export function toAppConfig(json: JsonConfig): AppConfig {
  return {
    gitUserName: json.user.name,
    gitUserEmailDefault: json.user.defaultEmail,
    profiles: json.profiles,
    enableGpgSigning: json.gpg.enabled,
    gpgProgram: json.gpg.program,
    gitCoreEditor: json.editor,
    enableConventionalCommits: json.hooks.conventionalCommits,
  }
}

/** Converts an AppConfig (from legacy .env) to JsonConfig format. */
function toJsonConfig(app: AppConfig): JsonConfig {
  return {
    version: 1,
    user: {
      name: app.gitUserName,
      defaultEmail: app.gitUserEmailDefault,
    },
    profiles: [...app.profiles],
    editor: app.gitCoreEditor,
    gpg: {
      enabled: app.enableGpgSigning,
      program: app.gpgProgram,
    },
    hooks: {
      conventionalCommits: app.enableConventionalCommits,
    },
  }
}

/** Migrates a legacy .env file to JsonConfig format. */
export async function migrateFromEnv(envPath: string): Promise<JsonConfig> {
  const appConfig = await loadConfig(envPath)
  return toJsonConfig(appConfig)
}

/**
 * Resolves configuration from available sources.
 * Priority: JSON config > legacy .env > null (no config found).
 */
export async function resolveConfig(): Promise<AppConfig | null> {
  if (await configExists()) {
    const json = await loadJsonConfig()
    return toAppConfig(json)
  }

  const legacyPath = getLegacyEnvPath()
  if (await pathExists(legacyPath)) {
    return loadConfig(legacyPath)
  }

  const envOverride = process.env.GITSETUP_ENV_FILE
  if (envOverride && (await pathExists(envOverride))) {
    return loadConfig(envOverride)
  }

  return null
}
