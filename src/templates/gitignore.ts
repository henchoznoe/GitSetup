/**
 * File: src/templates/gitignore.ts
 * Description: Global gitignore content
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

/** Returns the default global .gitignore content. */
export function renderGitignore(): string {
  return `
.DS_Store
.AppleDouble
.LSOverride
node_modules/
dist/
.idea/
.vscode/
*.log
build/
out/
.env
`
}
