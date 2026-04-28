/**
 * File: tests/templates/gitconfig.test.ts
 * Description: Tests for gitconfig template renderer
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { renderGitconfig } from '@/templates/gitconfig.ts'

describe('renderGitconfig', () => {
  it('renders with provided parameters', () => {
    const result = renderGitconfig({
      userName: 'John Doe',
      userEmail: 'john@example.com',
      coreEditor: 'vim',
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
    })

    expect(result).toContain('tool = code')
  })
})
