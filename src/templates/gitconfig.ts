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
}

/** Renders the global .gitconfig content with the given parameters. */
export function renderGitconfig(params: GitconfigParams): string {
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
    a = add .
    s = status
    br = branch
    co = checkout
    ci = commit
    ca = commit --amend
    can = commit --amend --no-edit
    cp = cherry-pick
    d = diff
    ds = diff --staged
    f = fetch --all --prune
    l = log --oneline --graph --decorate -20
    la = log --oneline --graph --decorate --all
    p = pull
    ps = push
    pf = push --force-with-lease
    rb = rebase
    rbi = rebase -i
    rs = restore --staged
    st = stash
    stp = stash pop
    sw = switch
    swc = switch -c
    undo = reset HEAD~1 --mixed
`
}
