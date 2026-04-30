<div align="center">

<img src="public/logo.png" alt="Logo" width="auto" height="200">

[![CI](https://github.com/henchoznoe/GitSetup/actions/workflows/ci.yml/badge.svg)](https://github.com/henchoznoe/GitSetup/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/henchoznoe/GitSetup/main?label=coverage&logo=codecov)](https://codecov.io/github/henchoznoe/GitSetup)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/henchoznoe/GitSetup)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Biome](https://img.shields.io/badge/formatter|linter-biome-39B420?style=flat&logo=biome)](https://biomejs.dev/)
[![Lines of Code](https://img.shields.io/badge/dynamic/json?label=lines%20of%20code&query=%24%5B-1%3A%5D.linesOfCode&url=https%3A%2F%2Fapi.codetabs.com%2Fv1%2Floc%3Fgithub%3Dhenchoznoe%2FGitSetup&color=blue)](https://github.com/henchoznoe/GitSetup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## GitSetup

A modular CLI tool to automate the configuration of your Git, SSH, and GPG environment on macOS.

</div>

## Overview

**GitSetup** automates the setup of your Git development environment on macOS. It manages multiple Git identities, generates SSH keys, configures GPG signing, and installs Git hooks — all from an interactive wizard or a single JSON config file.

## Features

- **Interactive Setup Wizard** — Configure everything via guided prompts on first run, with contextual explanations for each step.
- **Automated Git Configuration** — Global `.gitconfig`, `.gitignore`, and hooks in seconds.
- **Dynamic SSH Management** — Generates Ed25519 keys and configures `~/.ssh/config` per provider (GitHub, GitLab, etc.) with smart markers (non-destructive).
- **Multi-Identity Support** — Automatically switches Git user/email based on remote URL via post-checkout hooks.
- **GPG Signing** — Optional commit/tag signing with automatic key detection.
- **Profile Management** — Add, edit, or remove Git identities incrementally without re-running the wizard.
- **Safe & Idempotent** — Backups before overwrite, change detection preview, confirmation prompts, dry-run mode with clear "would create/overwrite/skip" output.
- **Detailed Feedback** — Spinners during operations, SSH key URLs for known hosts, and a final summary of all actions taken.
- **Cleanup Mode** — Remove all generated configurations cleanly.

## Prerequisites

- **macOS** (the only supported platform)
- **Node.js 22+**

```bash
brew install node git gnupg
```

| Dependency | Purpose |
| :--- | :--- |
| `node` | TypeScript runtime |
| `git` | Version control |
| `gnupg` | GPG commit signing (optional) |

## Installation

### Homebrew (recommended)

```bash
brew tap henchoznoe/tap
brew install git-setup
```

Then run:

```bash
git-setup
```

The interactive wizard will guide you through the configuration.

### From source

```bash
git clone https://github.com/henchoznoe/GitSetup.git
cd GitSetup
pnpm install
pnpm build
./dist/git-setup.js init
```

## Usage

```bash
git-setup              # Apply config if exists, otherwise start wizard
git-setup init         # Interactive first-time setup wizard
git-setup apply        # Apply current configuration to system
git-setup profile list # Show configured profiles
git-setup profile add  # Add a new identity profile
git-setup profile edit # Change the email of an existing profile
git-setup profile remove # Remove an identity profile
git-setup config show  # Print current configuration
git-setup config edit  # Open config in $EDITOR
git-setup status       # Show configuration summary and installation state
git-setup clean        # Remove all GitSetup-generated artifacts
```

### Global Options

| Flag | Description |
| :--- | :--- |
| `-d`, `--dry-run` | Simulate without making changes |
| `-y`, `--yes` | Skip confirmation prompts |
| `--verbose` | Show detailed output |
| `-v`, `--version` | Print version |
| `-h`, `--help` | Show help |

### Examples

```bash
# Preview what would happen
git-setup apply --dry-run

# Non-interactive apply
git-setup apply --yes

# Remove everything GitSetup created
git-setup clean --force

# Add a new profile without wizard
git-setup profile add --host gitlab.com --email me@gitlab.com
```

## Configuration

Configuration is stored at `~/.config/git-setup/config.json`:

```json
{
  "version": 1,
  "user": {
    "name": "John Doe",
    "defaultEmail": "john@example.com"
  },
  "profiles": [
    { "host": "github.com", "email": "john@example.com" },
    { "host": "gitlab.com", "email": "john@work.com" }
  ],
  "editor": "nano",
  "gpg": {
    "enabled": true,
    "program": "gpg"
  },
  "hooks": {
    "conventionalCommits": true
  }
}
```

You can edit this file directly or use `git-setup config set <key> <value>` with dot notation (e.g., `git-setup config set gpg.enabled true`).

## Project Structure

```
src/
├── bin/
│   └── git-setup.ts            # CLI entry point (macOS guard + Commander bootstrap)
├── cli/
│   ├── program.ts              # Commander program factory + subcommand registration
│   ├── wizard.ts               # Interactive setup wizard (@clack/prompts)
│   ├── helpers.ts              # Shared CLI helpers (dependency check)
│   └── commands/
│       ├── init.ts             # `git-setup init` — wizard + config save
│       ├── apply.ts            # `git-setup apply` — run managers from config
│       ├── profile.ts          # `git-setup profile list|add|edit|remove`
│       ├── config-cmd.ts       # `git-setup config show|edit|set|path`
│       ├── status.ts           # `git-setup status` — disk state check
│       └── clean.ts            # `git-setup clean` — remove artifacts
├── core/
│   ├── config.ts               # JSON config loading, validation, persistence
│   ├── constants.ts            # Named constants (markers, paths, permissions)
│   └── types.ts                # Shared interfaces (AppConfig, JsonConfig, Profile, AppOptions)
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
    ├── file-ops.ts             # File system helpers
    ├── logger.ts               # Colored output (Node 22 util.styleText)
    ├── prompt.ts               # Interactive prompts (@clack/prompts)
    ├── sanitize.ts             # String helpers
    └── spinner.ts              # Async task spinner wrapper
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
