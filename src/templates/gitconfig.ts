/**
 * File: src/templates/gitconfig.ts
 * Description: Git global configuration template renderer
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

interface GitconfigParams {
  readonly userName: string
  readonly userEmail: string
  readonly coreEditor: string
  readonly aliases: readonly { alias: string; command: string }[]
}

/** Renders the global .gitconfig content with the given parameters. */
export function renderGitconfig(params: GitconfigParams): string {
  const aliasLines = params.aliases
    .map(a => `    ${a.alias} = ${a.command}`)
    .join('\n')

  return `
[user]
    name = ${params.userName}
    email = ${params.userEmail}

[core]
    editor = ${params.coreEditor}
    autocrlf = input
    pager = less -FRX
    excludesfile = ~/.gitignore_global

[init]
    defaultBranch = main

[color]
    ui = auto

[color "status"]
    added = green
    changed = yellow
    untracked = red

[merge]
    ff = false

[pull]
    rebase = true

[push]
    default = current
    autoSetupRemote = true
    followTags = true

[diff]
    tool = ${params.coreEditor}

[alias]
${aliasLines}
`
}
