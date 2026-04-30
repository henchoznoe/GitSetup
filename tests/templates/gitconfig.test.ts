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
})
