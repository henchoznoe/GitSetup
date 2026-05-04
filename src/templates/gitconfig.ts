/**
 * File: src/templates/gitconfig.ts
 * Description: Git global configuration template renderer
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

interface GpgSigningParams {
  readonly signingKey: string
  readonly program: string
}

interface GitconfigParams {
  readonly userName: string
  readonly userEmail: string
  readonly coreEditor: string
  readonly aliases: readonly { alias: string; command: string }[]
  readonly templateDir?: string
  readonly gpgSigning?: GpgSigningParams
}

/** Renders the global .gitconfig content with the given parameters. */
export function renderGitconfig(params: GitconfigParams): string {
  const aliasLines = params.aliases
    .map(a => `    ${a.alias} = ${a.command}`)
    .join('\n')

  const signingLine = params.gpgSigning
    ? `\n    signingkey = ${params.gpgSigning.signingKey}`
    : ''

  const templateDirLine = params.templateDir
    ? `\n    templatedir = ${params.templateDir}`
    : ''

  const gpgSection = params.gpgSigning
    ? `
[gpg]
    program = ${params.gpgSigning.program}

[commit]
    gpgsign = true

[tag]
    gpgsign = true
`
    : ''

  return `
[user]
    name = ${params.userName}
    email = ${params.userEmail}${signingLine}

[core]
    editor = ${params.coreEditor}
    autocrlf = input
    pager = less -FRX
    excludesfile = ~/.gitignore_global

[init]
    defaultBranch = main${templateDirLine}

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
${gpgSection}
[alias]
${aliasLines}
`
}
