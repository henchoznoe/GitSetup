# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitSetup is a macOS-only TypeScript CLI tool that automates Git, SSH, and GPG environment configuration. It manages multiple Git identities via an interactive wizard (or JSON config at `~/.config/git-setup/config.json`), generating SSH keys, global gitconfig, and post-checkout hooks that switch user identity based on remote URL. Installable via `brew install git-setup`.

## Commands

```bash
pnpm start                  # Run GitSetup
pnpm start:dry              # Run in dry-run mode
pnpm test                   # Vitest once
pnpm test:coverage          # Vitest with coverage (CI uses this)
pnpm vitest run tests/path/to/file.test.ts  # Single test file
pnpm vitest run -t "name"   # Tests matching pattern
pnpm exec tsc --noEmit      # Type-check
pnpm exec biome check .     # Lint/format check (matches CI)
pnpm check                  # Biome check --write
pnpm check:all              # Biome + knip + vitest + tsc (full local verification)
```

## Architecture

Entry point: `src/bin/git-setup.ts` — guards macOS-only, bootstraps Commander program.

```
src/
├── bin/git-setup.ts          # CLI entry point (macOS guard + Commander bootstrap)
├── cli/
│   ├── program.ts            # Commander program factory + subcommand registration
│   ├── wizard.ts             # Interactive setup wizard (@clack/prompts)
│   ├── helpers.ts            # Shared CLI helpers (dependency check)
│   └── commands/
│       ├── init.ts           # `git-setup init` — wizard + config save
│       ├── apply.ts          # `git-setup apply` — run managers from config
│       ├── profile.ts        # `git-setup profile list|add|remove`
│       ├── config-cmd.ts     # `git-setup config show|edit|set|path`
│       ├── status.ts         # `git-setup status` — disk state check
│       └── clean.ts          # `git-setup clean` — remove artifacts
├── core/
│   ├── config.ts             # JSON + legacy .env loading, Zod validation, save/migrate
│   ├── constants.ts          # Named constants (markers, paths, permissions, regex)
│   └── types.ts              # Shared interfaces (AppConfig, JsonConfig, Profile, AppOptions)
├── managers/
│   ├── ssh-manager.ts        # SSH key generation + ~/.ssh/config block management
│   ├── git-manager.ts        # Gitconfig/gitignore + hook installation
│   ├── gpg-manager.ts        # GPG key lookup/generation + signing config
│   └── cleaner.ts            # Reverse setup — remove all artifacts
├── templates/
│   ├── gitconfig.ts          # Gitconfig template literal renderer
│   ├── gitignore.ts          # Global gitignore content
│   └── hooks.ts              # Hook script generators (identity switch, conventional commits)
└── utils/
    ├── executor.ts           # Dry-run aware command execution (child_process)
    ├── file-block.ts         # Marker-based non-destructive file editing
    ├── file-ops.ts           # Backup, ensure-dir, write-file, .env parser
    ├── logger.ts             # Colored output via util.styleText (Node 22)
    ├── prompt.ts             # Interactive prompts via @clack/prompts
    └── sanitize.ts           # sanitizeHost, string helpers
```

Key patterns:
- All configuration passed via function parameters (no global state)
- `AppConfig` (from JSON or legacy .env) and `AppOptions` (from CLI flags) flow through all managers
- Config stored at `~/.config/git-setup/config.json` (JSON, Zod-validated)
- `updateFileBlock` handles marker-based non-destructive file editing
- `executeCommand` wraps all shell commands with dry-run support
- Templates are pure functions returning strings (no external template files)
- CLI uses Commander.js (subcommands) + @clack/prompts (interactive wizard)

## CI/CD

- GitHub Actions on `ubuntu-latest` (lint/type-check/test), macOS for functional tests
- semantic-release on `main` branch (configured in `.releaserc.json`)
- Commits must follow Conventional Commits format
- PR titles validated via `.github/workflows/pr-title.yml`

## Repo Conventions

- Every `.ts` file starts with the repository header block (File, Description, Author, License, Copyright).
- Biome for lint/format (not ESLint/Prettier). `noExplicitAny: error`.
- Behavior changes must ship with tests.
- Use `/* v8 ignore next */` to exclude branches that are unreachable in practice from coverage reports.
- Path alias `@/*` maps to `./src/*`.
- Runtime: Node 22 with tsx (no build step). Uses native `util.styleText` and `@clack/prompts`.

## 10 Commandments of Code

1. **No global variables** — No global state. Functions receive all data via parameters.
2. **File headers** — Every source file starts with a comment: copyright, title, author, license.
3. **Careful identifier naming** — Action verbs for procedures, descriptive nouns for functions. English only, no special characters. Short identifiers (i, j, k) only for short-scope loops.
4. **Consistent style** — 2-space indent, max 120 chars/line, max ~50 lines/method. Biome enforces formatting.
5. **JSDoc comments** — Short comment before each public method explaining what it does. Do not document the obvious.
6. **No magic numbers** — All constants have descriptive names. Exception: `0`, `1` in trivial contexts.
7. **Version control discipline** — Regular commits with Conventional Commits format. Sync often.
8. **DRY (Don't Repeat Yourself)** — No copy-paste. Extract shared logic into functions. But prioritize simplicity over over-abstraction.
9. **Unit tests** — Verify methods with tests. Use Vitest. Cover as much as practical.
10. **KISS (Keep It Small and Simple)** — No unnecessary complexity. Simple algorithms, efficient code, minimal abstractions.
