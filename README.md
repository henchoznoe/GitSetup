<div align="center">

<img src="public/logo.png" alt="Logo" width="auto" height="200">

[![CI](https://github.com/henchoznoe/GitSetup/actions/workflows/ci.yml/badge.svg)](https://github.com/henchoznoe/GitSetup/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/henchoznoe/GitSetup/main?label=coverage&logo=codecov)](https://codecov.io/github/henchoznoe/GitSetup)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/henchoznoe/GitSetup)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Biome](https://img.shields.io/badge/formatter|linter-biome-39B420?style=flat&logo=biome)](https://biomejs.dev/)
[![macOS](https://img.shields.io/badge/macOS-only-000000?style=flat&logo=apple)](https://www.apple.com/macos/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## GitSetup

A modular CLI tool to automate the configuration of your Git, SSH, and GPG environment on macOS.

</div>

## Overview

**GitSetup** automates the setup of your Git development environment on macOS. It manages multiple Git identities, generates SSH keys, configures GPG signing, and installs Git hooks — all from a single `.env` file.

## Features

- **Automated Git Configuration** — Global `.gitconfig`, `.gitignore`, and hooks in seconds.
- **Dynamic SSH Management** — Generates Ed25519 keys and configures `~/.ssh/config` per provider (GitHub, GitLab, etc.) with smart markers (non-destructive).
- **Multi-Identity Support** — Automatically switches Git user/email based on remote URL via post-checkout hooks.
- **GPG Signing** — Optional commit/tag signing with automatic key detection.
- **Safe & Idempotent** — Backups before overwrite, confirmation prompts, dry-run mode.
- **Cleanup Mode** — Remove all generated configurations cleanly.

## Prerequisites

- **macOS** (the only supported platform)
- **Node.js 22+** (uses native `util.styleText` and `readline/promises`)
- **pnpm** (package manager)

```bash
brew install node pnpm git gnupg
```

| Dependency | Purpose |
| :--- | :--- |
| `node` | TypeScript runtime (via tsx) |
| `pnpm` | Package manager |
| `git` | Version control |
| `gnupg` | GPG commit signing (optional) |

## Installation

### Homebrew (recommended)

```bash
brew tap henchoznoe/tap
brew install git-setup
```

After installing, create your configuration file:

```bash
curl -o ~/.config/git-setup/.env https://raw.githubusercontent.com/henchoznoe/GitSetup/main/.env.example
export GITSETUP_ENV_FILE="$HOME/.config/git-setup/.env"
```

Edit `~/.config/git-setup/.env` with your details (see [Configuration](#configuration)).

### From source

```bash
git clone https://github.com/henchoznoe/GitSetup.git
cd GitSetup
pnpm install
pnpm build
cp .env.example .env
```

Edit `.env` with your details (see [Configuration](#configuration)).

## Usage

```bash
pnpm start
```

### Options

| Flag | Description |
| :--- | :--- |
| `-d`, `--dry-run` | Simulate without making changes |
| `-y`, `--yes` | Skip confirmation prompts |
| `--clean` | Remove all GitSetup-generated configurations |

### Examples

```bash
# Preview what would happen
pnpm start:dry

# Non-interactive setup
pnpm exec tsx src/bin/git-setup.ts --yes

# Remove everything GitSetup created
pnpm exec tsx src/bin/git-setup.ts --clean
```

## Configuration

The `.env` file controls all behavior:

```bash
# Identity
GIT_USER_NAME="John Doe"
GIT_USER_EMAIL_DEFAULT="john@example.com"

# Profiles (format: "host:email,host:email")
GIT_PROFILES="github.com:john@example.com,gitlab.com:john@work.com"

# GPG Signing
ENABLE_GPG_SIGNING="true"
GPG_PROGRAM="gpg"

# Editor
GIT_CORE_EDITOR="nano"

# Conventional Commits hook
ENABLE_CONVENTIONAL_COMMITS="true"
```

## Project Structure

```
src/
├── bin/
│   └── git-setup.ts            # CLI entry point
├── core/
│   ├── config.ts               # .env loading + Zod validation + profile parsing
│   ├── constants.ts            # Named constants (markers, paths, permissions)
│   └── types.ts                # Shared interfaces (AppConfig, Profile, AppOptions)
├── managers/
│   ├── ssh-manager.ts          # SSH key generation + config block management
│   ├── git-manager.ts          # Gitconfig/gitignore + hook installation
│   ├── gpg-manager.ts          # GPG key lookup/generation + signing config
│   └── cleaner.ts              # Reverse setup — remove all artifacts
├── templates/
│   ├── gitconfig.ts            # Gitconfig template renderer
│   ├── gitignore.ts            # Global gitignore content
│   └── hooks.ts                # Hook script generators
└── utils/
    ├── executor.ts             # Dry-run aware command execution
    ├── file-block.ts           # Marker-based non-destructive file editing
    ├── file-ops.ts             # File system helpers + .env parser
    ├── logger.ts               # Colored output (Node 22 util.styleText)
    ├── prompt.ts               # User confirmation prompts
    └── sanitize.ts             # String helpers
```

## Development

```bash
pnpm test                   # Run tests
pnpm test:coverage          # Tests with coverage
pnpm exec tsc --noEmit      # Type-check
pnpm exec biome check .     # Lint/format check
pnpm check:all              # Full verification (biome + knip + vitest + tsc)
```

## Contributing

Pull requests welcome. For major changes, open an issue first.

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format.

## License

[MIT](LICENSE)
