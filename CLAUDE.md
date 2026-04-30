# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitSetup is a macOS-only TypeScript CLI tool that automates Git, SSH, and GPG environment configuration. It manages multiple Git identities via an interactive wizard, storing config at `~/.config/git-setup/config.json`. Generates SSH keys, global gitconfig, and post-checkout hooks that switch user identity based on remote URL. Installable via `brew install git-setup`.

## Commands

```bash
pnpm start                  # Run GitSetup (tsx, no build)
pnpm start:dry              # Run in dry-run mode
pnpm build                  # Bundle to dist/git-setup.js via esbuild
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

**Data flow:** CLI flags → `AppOptions` | JSON config → `JsonConfig` → `toAppConfig()` → `AppConfig` → managers

```
src/
├── bin/git-setup.ts          # CLI entry point (macOS guard + Commander bootstrap)
├── cli/
│   ├── program.ts            # Commander program factory + subcommand registration
│   ├── wizard.ts             # Interactive setup wizard (@clack/prompts)
│   ├── helpers.ts            # Shared CLI helpers (dependency check)
│   └── commands/             # One file per subcommand (init, apply, profile, config-cmd, status, clean)
├── core/
│   ├── config.ts             # JSON config load/save/validate (Zod), resolveConfig()
│   ├── constants.ts          # Named constants (markers, paths, permissions, regex)
│   └── types.ts              # Shared interfaces (AppConfig, JsonConfig, Profile, AppOptions)
├── managers/                 # Side-effect layer — SSH keys, gitconfig, GPG, cleanup
├── templates/                # Pure functions returning file content strings
└── utils/                    # Dry-run executor, marker-based file editing, file ops, logger, prompts
```

Key patterns:
- All configuration passed via function parameters (no global state)
- `AppConfig` (from Zod-validated JSON) and `AppOptions` (from CLI flags) flow through all managers
- `updateFileBlock` handles marker-based non-destructive file editing (SSH config)
- `executeCommand` wraps all shell commands with dry-run support
- Templates are pure functions returning strings
- CLI: Commander.js (subcommands) + @clack/prompts (interactive wizard)
- Build: esbuild bundles to single ESM file with `createRequire` shim for CJS deps

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
- Runtime: Node 22 with tsx (no build step for dev). Uses native `util.styleText`.
- Coverage excludes `src/bin/git-setup.ts` and `src/cli/**/*.ts` (interactive/integration code).

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
