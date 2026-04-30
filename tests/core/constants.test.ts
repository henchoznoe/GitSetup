/**
 * File: tests/core/constants.test.ts
 * Description: Tests for named constants
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import {
  CONVENTIONAL_COMMIT_REGEX,
  GIT_ALIASES,
  GIT_TEMPLATE_DIR,
  GITCONFIG_DEST,
  GITIGNORE_DEST,
  HOOK_SIGNATURE,
  HOOKS_DIR,
  resolveAliases,
  SSH_DIR_PERMISSIONS,
  SSH_FILE_PERMISSIONS,
  SSH_KEY_TYPE,
  SSH_MARKER_END,
  SSH_MARKER_START,
} from '@/core/constants.ts'

describe('constants', () => {
  it('SSH markers are paired', () => {
    expect(SSH_MARKER_START).toContain('GITSETUP START')
    expect(SSH_MARKER_END).toContain('GITSETUP END')
  })

  it('SSH key type is ed25519', () => {
    expect(SSH_KEY_TYPE).toBe('ed25519')
  })

  it('SSH permissions are restrictive', () => {
    expect(SSH_DIR_PERMISSIONS).toBe(0o700)
    expect(SSH_FILE_PERMISSIONS).toBe(0o600)
  })

  it('CONVENTIONAL_COMMIT_REGEX validates correct messages', () => {
    expect(CONVENTIONAL_COMMIT_REGEX.test('feat: add feature')).toBe(true)
    expect(CONVENTIONAL_COMMIT_REGEX.test('fix(auth): resolve bug')).toBe(true)
    expect(CONVENTIONAL_COMMIT_REGEX.test('chore: update deps')).toBe(true)
    expect(
      CONVENTIONAL_COMMIT_REGEX.test('refactor(core): simplify logic'),
    ).toBe(true)
  })

  it('CONVENTIONAL_COMMIT_REGEX rejects invalid messages', () => {
    expect(CONVENTIONAL_COMMIT_REGEX.test('invalid message')).toBe(false)
    expect(CONVENTIONAL_COMMIT_REGEX.test('feat:')).toBe(false)
    expect(CONVENTIONAL_COMMIT_REGEX.test('FEAT: uppercase')).toBe(false)
  })

  it('path constants are defined', () => {
    expect(GIT_TEMPLATE_DIR).toBe('.git_template')
    expect(GITCONFIG_DEST).toBe('.gitconfig')
    expect(GITIGNORE_DEST).toBe('.gitignore_global')
    expect(HOOKS_DIR).toBe('hooks')
  })

  it('hook signature is defined', () => {
    expect(HOOK_SIGNATURE).toContain('GitSetup')
  })
})

describe('resolveAliases', () => {
  it('returns all defaults when no overrides', () => {
    const result = resolveAliases([])
    expect(result).toHaveLength(GIT_ALIASES.length)
    expect(result[0].alias).toBe('a')
  })

  it('overrides a default alias command', () => {
    const result = resolveAliases([
      { alias: 'l', command: 'log --oneline -10' },
    ])
    const l = result.find(a => a.alias === 'l')
    expect(l?.command).toBe('log --oneline -10')
    expect(l?.description).toBe('custom')
  })

  it('disables a default alias', () => {
    const result = resolveAliases([{ alias: 'pf', disabled: true }])
    expect(result.find(a => a.alias === 'pf')).toBeUndefined()
    expect(result.length).toBe(GIT_ALIASES.length - 1)
  })

  it('adds a new custom alias', () => {
    const result = resolveAliases([
      { alias: 'wip', command: "commit -m 'wip'" },
    ])
    const wip = result.find(a => a.alias === 'wip')
    expect(wip?.command).toBe("commit -m 'wip'")
    expect(wip?.description).toBe('custom')
    expect(result.length).toBe(GIT_ALIASES.length + 1)
  })

  it('ignores disabled alias that does not exist in defaults', () => {
    const result = resolveAliases([{ alias: 'nonexistent', disabled: true }])
    expect(result.length).toBe(GIT_ALIASES.length)
  })

  it('ignores override without command for unknown alias', () => {
    const result = resolveAliases([{ alias: 'xyz' }])
    expect(result.length).toBe(GIT_ALIASES.length)
  })

  it('ignores override without command or disabled for existing alias', () => {
    const result = resolveAliases([{ alias: 'a' }])
    const a = result.find(r => r.alias === 'a')
    expect(a?.command).toBe('add .')
    expect(result.length).toBe(GIT_ALIASES.length)
  })
})
