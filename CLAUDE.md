# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitSetup is a macOS-only TypeScript CLI tool that automates Git, SSH, and GPG environment configuration. It manages multiple Git identities via a single `.env` file, generating SSH keys, global gitconfig, and post-checkout hooks that switch user identity based on remote URL.

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

Entry point: `src/bin/git-setup.ts` — guards macOS-only, parses CLI flags, loads config, orchestrates managers.

```
src/
├── bin/git-setup.ts          # CLI entry point
├── core/
│   ├── config.ts             # .env loading + Zod validation + profile parsing
│   ├── constants.ts          # Named constants (markers, paths, permissions, regex)
│   └── types.ts              # Shared interfaces (AppConfig, Profile, AppOptions)
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
    ├── prompt.ts             # Confirmation via readline/promises (Node 22)
    └── sanitize.ts           # sanitizeHost, string helpers
```

Key patterns:
- All configuration passed via function parameters (no global state)
- `AppConfig` (from Zod-validated .env) and `AppOptions` (from CLI flags) flow through all managers
- `updateFileBlock` handles marker-based non-destructive file editing
- `executeCommand` wraps all shell commands with dry-run support
- Templates are pure functions returning strings (no external template files)

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
- Runtime: Node 22 with tsx (no build step). Uses native `util.styleText` and `readline/promises`.

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
