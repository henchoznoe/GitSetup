# GitSetup — Roadmap

This roadmap captures concrete improvements and new features identified during the audit. Items are grouped by theme and ordered roughly by **value × ease**.

> Legend: `S` small (≤ ½ day), `M` medium (1–2 days), `L` large (≥ 3 days).

## 1. Verification & Diagnostics

- **`git-setup verify`** *(S)* — run `ssh -T git@<host>` against every profile and report which keys are registered. Catches the most common failure mode after `apply` (forgot to paste the key on GitHub).
- **`git-setup doctor`** *(M)* — single command that diagnoses the local environment: `gpg-agent` running, `ssh-agent` running, `~/.gitconfig` matches the rendered template, hook files exist, `init.templatedir` resolves, GPG key present for each profile, `gh` available, etc. Output a checklist with pass/fail/fix-suggestion.
- **`git-setup status --json`** *(S)* — machine-readable status output for scripting and dashboards.

## 2. Identity & Signing UX

- **SSH commit signing** (`gpg.format = ssh`) *(M)* — modern alternative to GPG: sign commits with the per-profile SSH key. Auto-generate `~/.config/git/allowed_signers` from profiles. Avoids a second key per identity.
- **Hardware key support** *(L)* — detect YubiKey / OpenPGP smart cards via `gpg --card-status` and configure `gpg.program` + touch policy. Optional `--hardware-only` flag to refuse key generation when no card is present.
- **GPG expiry policy** *(S)* — configurable `expiry` (default `1y`), with a `--force-no-expiry` opt-out. Today keys are generated with `0` (never expires), which is not a security best-practice.
- **SSH key passphrase prompt** *(S)* — currently keys are generated with `-N ''` (empty passphrase). Offer an opt-in passphrase prompt; on macOS, integrate with `--apple-use-keychain`.
- **Renew expired GPG keys** *(M)* — `git-setup gpg renew` extends key expiry without regenerating, then re-exports the armored block.

## 3. Profile Management

- **`includeIf` based identity switching** *(M)* — alternative to remote-URL hooks: render `[includeIf "gitdir:~/work/"]` blocks in `~/.gitconfig` to switch identity by working directory. More predictable than the post-checkout hook and works without `init.templatedir`.
- **Profile tags / categories** *(S)* — `work`, `personal`, `client-x` tags for filtering and grouping in `profile list`.
- **Per-profile aliases** *(M)* — aliases scoped to a host (e.g. a `[includeIf "hasconfig:remote.*.url:*github.com*"]` block).
- **`git-setup migrate`** *(M)* — read an existing `~/.gitconfig` / `~/.ssh/config` and pre-fill the wizard. Lowers the barrier for adoption.
- **Cleanup orphan SSH keys on profile remove** *(S)* — when `profile remove` deletes a host, prompt to also delete `~/.ssh/id_ed25519_<host>{,.pub}`.

## 4. Cross-Platform Support

- **Linux support** *(M)* — drop the macOS-only guard, audit hard-coded paths (most are already POSIX-friendly), test on Ubuntu/Arch/Fedora. Adapt clipboard / GUI prompts (e.g. `xdg-open` instead of `open`).
- **Windows / WSL** *(L)* — separate path layout (`%APPDATA%\git-setup`), Git Bash compatibility, port hooks to PowerShell or guarantee POSIX shell on the path.

## 5. Provider Integrations

- **Auto-upload SSH/GPG keys via `gh`** *(S)* — when `gh` is detected and authenticated, offer `gh ssh-key add` / `gh gpg-key add` instead of asking the user to copy-paste.
- **GitLab / Codeberg / Forgejo APIs** *(M)* — same idea, via `glab` or token-based REST upload.
- **Pre-populate `~/.ssh/known_hosts`** *(S)* — bundle the public keys for github.com, gitlab.com, bitbucket.org, codeberg.org. Refresh via a `git-setup refresh-known-hosts` subcommand.

## 6. Developer Experience

- **Shell completion** *(S)* — `git-setup completion zsh|bash|fish` emits a completion script. Trivial with Commander's built-in support.
- **`--json` everywhere** *(S)* — machine-readable output for `profile list`, `status`, `verify`, `doctor`.
- **Hook customization** *(M)* — let the user append their own pre-commit / pre-push templates that get installed alongside the built-in ones, without colliding.
- **Conventional Commits scopes** *(S)* — extend the commit-msg hook to optionally enforce a project-specific list of scopes.

## 7. Portability & Backup

- **`git-setup export` / `git-setup import`** *(M)* — bundle the JSON config and (optionally) the SSH/GPG keys into a single archive (encrypted with `age` or `gpg`) for moving between machines. Imports re-run `apply` after restoring keys.
- **Versioned config schema** *(S)* — `JsonConfig` already has a `version` field; add migration helpers (`migrateV1ToV2`) so future schema changes are non-breaking.

## 8. Quality / Internals (technical-debt)

- **Atomic `~/.gitconfig` writes** *(S)* — write to `.gitconfig.tmp` then `rename` to avoid leaving a half-written file on disk if the process crashes.
- **Coverage for CLI commands** *(M)* — `src/cli/**/*.ts` is excluded from coverage today. Wrap Commander actions in thin functions and unit-test those.
- **Type-safe Commander options** *(S)* — most `opts: Record<string, unknown>` parameters can be typed with explicit interfaces, removing the `Boolean(...)` / `String(...)` casts.
- **Profile uniqueness invariant in the schema** *(S)* — Zod refinement that rejects duplicate `host` entries, instead of catching the duplicate at runtime in `profile add`.
- **Observability** *(S)* — structured `--verbose` output (one line per shell command, with timing) to help debug failed `apply` runs.

---

If you have other ideas, please open an issue or extend this list.
