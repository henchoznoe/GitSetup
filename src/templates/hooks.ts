/**
 * File: src/templates/hooks.ts
 * Description: Git hook script generators for identity switching and commit validation
 * Author: Noé Henchoz
 * License: MIT
 * Copyright (c) 2026 Noé Henchoz
 */

import { CONVENTIONAL_COMMIT_REGEX, HOOK_SIGNATURE } from '../core/constants.ts'

interface HookProfile {
  readonly host: string
  readonly email: string
  readonly gpgKeyId?: string
}

/** Renders the identity-switch hook script (used by post-checkout, post-commit, post-merge). */
export function renderIdentitySwitchHook(
  profiles: readonly HookProfile[],
  defaultEmail: string,
): string {
  const caseEntries = profiles.map(profile => {
    const signingLine = profile.gpgKeyId
      ? `    git config user.signingkey "${profile.gpgKeyId}"\n`
      : ''
    return `  *"${profile.host}"*)
    git config user.email "${profile.email}"
${signingLine}    echo "[Hook] Switched to: ${profile.host} (${profile.email})"
    ;;`
  })

  const defaultCase = `  *)
    git config user.email "${defaultEmail}"
    echo "[Hook] Using default: ${defaultEmail}"
    ;;`

  return `
#!/bin/bash
# ${HOOK_SIGNATURE}
# Automatically adjust Git user identity based on the remote host

remote_url=$(git remote get-url origin 2>/dev/null)
if [ -z "$remote_url" ]; then
  exit 0
fi

case "$remote_url" in
${caseEntries.join('\n')}
${defaultCase}
esac
`
}

/** Renders the Conventional Commits validation hook script. */
export function renderConventionalCommitHook(): string {
  const pattern = CONVENTIONAL_COMMIT_REGEX.source
  return `
#!/bin/bash
# ${HOOK_SIGNATURE}
# Validates commit messages against Conventional Commits format

commit_msg_file="$1"
commit_msg=$(head -n 1 "$commit_msg_file")

pattern="${pattern}"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo ""
  echo "[ERROR] Invalid commit message format."
  echo ""
  echo "Expected: <type>(<scope>): <subject>"
  echo ""
  echo "Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
  echo ""
  echo "Examples:"
  echo "  feat: add user authentication"
  echo "  fix(auth): resolve token expiry issue"
  echo "  docs: update API documentation"
  echo ""
  exit 1
fi
`
}
