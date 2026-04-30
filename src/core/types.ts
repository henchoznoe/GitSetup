/**
 * File: src/core/types.ts
 * Description: Shared type definitions for GitSetup
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

/** A single host:email identity profile. */
export interface Profile {
  readonly host: string
  readonly email: string
}

/** Parsed and validated environment configuration. */
export interface AppConfig {
  readonly gitUserName: string
  readonly gitUserEmailDefault: string
  readonly profiles: readonly Profile[]
  readonly enableGpgSigning: boolean
  readonly gpgProgram: string
  readonly gitCoreEditor: string
  readonly enableConventionalCommits: boolean
}

/** Runtime options derived from CLI flags. */
export interface AppOptions {
  readonly dryRun: boolean
  readonly assumeYes: boolean
  readonly verbose: boolean
  readonly sshDir: string
}

/** JSON config file schema (persisted to disk). */
export interface JsonConfig {
  readonly version: 1
  readonly user: {
    readonly name: string
    readonly defaultEmail: string
  }
  readonly profiles: readonly Profile[]
  readonly editor: string
  readonly gpg: {
    readonly enabled: boolean
    readonly program: string
  }
  readonly hooks: {
    readonly conventionalCommits: boolean
  }
}

/** Result of executing an external command. */
export interface ExecResult {
  readonly stdout: string
  readonly stderr: string
}

/** Function type for GPG key lookup, decouples git-manager from gpg-manager. */
export type GpgKeyFinder = (email: string) => Promise<string | null>
