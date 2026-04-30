/**
 * File: src/core/config.ts
 * Description: JSON configuration loading, validation, and persistence
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import {
  ensureDirectory,
  homePath,
  pathExists,
  writeFileSafe,
} from '../utils/file-ops.ts'
import { CONFIG_DIR, CONFIG_FILE } from './constants.ts'
import type { AppConfig, JsonConfig } from './types.ts'

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

/** Returns the full path to the JSON config file. */
export function getConfigPath(): string {
  return homePath(CONFIG_DIR, CONFIG_FILE)
}

/** Returns the full path to the config directory. */
function getConfigDir(): string {
  return homePath(CONFIG_DIR)
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

/** Resolves configuration. Returns null if no config found. */
export async function resolveConfig(): Promise<AppConfig | null> {
  if (await configExists()) {
    const json = await loadJsonConfig()
    return toAppConfig(json)
  }
  return null
}
