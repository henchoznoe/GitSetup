/**
 * File: tests/templates/gitconfig.test.ts
 * Description: Tests for gitconfig template renderer
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { GIT_ALIASES, resolveAliases } from '@/core/constants.ts'
import { renderGitconfig } from '@/templates/gitconfig.ts'

const defaultAliases = resolveAliases([])

describe('renderGitconfig', () => {
  it('renders with provided parameters', () => {
    const result = renderGitconfig({
      userName: 'John Doe',
      userEmail: 'john@example.com',
      coreEditor: 'vim',
      aliases: defaultAliases,
    })

    expect(result).toContain('name = John Doe')
    expect(result).toContain('email = john@example.com')
    expect(result).toContain('editor = vim')
  })

  it('includes standard git settings', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
    })

    expect(result).toContain('[user]')
    expect(result).toContain('[core]')
    expect(result).toContain('[init]')
    expect(result).toContain('[push]')
    expect(result).toContain('[pull]')
    expect(result).toContain('[alias]')
    expect(result).toContain('defaultBranch = main')
    expect(result).toContain('rebase = true')
  })

  it('includes diff tool matching editor', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'code',
      aliases: defaultAliases,
    })

    expect(result).toContain('tool = code')
  })

  it('renders all default aliases', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
    })

    for (const { alias, command } of GIT_ALIASES) {
      expect(result).toContain(`${alias} = ${command}`)
    }
  })

  it('renders custom aliases', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: [{ alias: 'wip', command: "commit -m 'wip'" }],
    })

    expect(result).toContain("wip = commit -m 'wip'")
    expect(result).not.toContain('a = add .')
  })

  it('uses 4-space indentation everywhere (no tabs)', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'vim',
      aliases: defaultAliases,
      templateDir: '/home/user/.git_template',
      gpgSigning: { signingKey: 'BB1DD9C1AC6AD90B', program: 'gpg' },
    })

    expect(result).not.toMatch(/\t/)
    for (const line of result.split('\n')) {
      if (/^\s/.test(line)) {
        expect(line).toMatch(/^ {4}\S/)
      }
    }
  })

  it('embeds signingkey in [user] when gpgSigning is provided', () => {
    const result = renderGitconfig({
      userName: 'Noé',
      userEmail: 'noe@example.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
      gpgSigning: { signingKey: 'BB1DD9C1AC6AD90B', program: 'gpg' },
    })

    expect(result).toMatch(
      /\[user\]\n {4}name = Noé\n {4}email = noe@example\.com\n {4}signingkey = BB1DD9C1AC6AD90B/,
    )
  })

  it('embeds [gpg]/[commit]/[tag] sections when gpgSigning is provided', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
      gpgSigning: { signingKey: 'KEY', program: 'gpg2' },
    })

    expect(result).toContain('[gpg]\n    program = gpg2')
    expect(result).toContain('[commit]\n    gpgsign = true')
    expect(result).toContain('[tag]\n    gpgsign = true')
  })

  it('omits GPG sections when gpgSigning is undefined', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
    })

    expect(result).not.toContain('signingkey')
    expect(result).not.toContain('[gpg]')
    expect(result).not.toContain('[commit]')
    expect(result).not.toContain('[tag]')
  })

  it('embeds templatedir in [init] when provided', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
      templateDir: '/Users/noe/.git_template',
    })

    expect(result).toMatch(
      /\[init\]\n {4}defaultBranch = main\n {4}templatedir = \/Users\/noe\/\.git_template/,
    )
  })

  it('omits templatedir line when not provided', () => {
    const result = renderGitconfig({
      userName: 'Test',
      userEmail: 'test@test.com',
      coreEditor: 'nano',
      aliases: defaultAliases,
    })

    expect(result).not.toContain('templatedir')
  })
})
