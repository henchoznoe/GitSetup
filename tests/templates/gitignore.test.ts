/**
 * File: tests/templates/gitignore.test.ts
 * Description: Tests for gitignore template
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { renderGitignore } from '@/templates/gitignore.ts'

describe('renderGitignore', () => {
  it('returns non-empty content', () => {
    const result = renderGitignore()
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes common macOS patterns', () => {
    const result = renderGitignore()
    expect(result).toContain('.DS_Store')
  })

  it('includes common development patterns', () => {
    const result = renderGitignore()
    expect(result).toContain('node_modules/')
    expect(result).toContain('.env')
  })

  it('includes IDE directories', () => {
    const result = renderGitignore()
    expect(result).toContain('.idea/')
    expect(result).toContain('.vscode/')
  })
})
