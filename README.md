<div align="center">

<img src="assets/logo.png" alt="Logo" width="auto" height="200">

[![CI](https://github.com/henchoznoe/GitSetup/actions/workflows/ci.yml/badge.svg)](https://github.com/henchoznoe/GitSetup/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/henchoznoe/GitSetup)

[![Bash](https://img.shields.io/badge/Bash-5.2-161621?style=flat&logo=bash)](https://www.gnu.org/software/bash/)
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

macOS with [Homebrew](https://brew.sh) installed.

```bash
brew install git gettext gnupg
```

| Dependency | Purpose |
| :--- | :--- |
| `git` | Version control |
| `gettext` | Template variable substitution (`envsubst`) |
| `gnupg` | GPG commit signing (optional but recommended) |

## Installation

```bash
git clone https://github.com/henchoznoe/GitSetup.git
cd GitSetup
cp .env.example .env
```

Edit `.env` with your details (see [Configuration](#configuration)).

## Usage

```bash
./bin/git-setup
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
./bin/git-setup --dry-run

# Non-interactive setup (CI, scripting)
./bin/git-setup --yes

# Remove everything GitSetup created
./bin/git-setup --clean
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
├── bin/git-setup          # Entry point
├── lib/
│   ├── logger.sh          # Colored output
│   ├── utils.sh           # Utilities (backup, confirm, block update)
│   ├── config.sh          # .env loader and profile iterator
│   ├── ssh_manager.sh     # SSH key generation and config
│   ├── git_manager.sh     # Git config, hooks
│   ├── gpg_manager.sh     # GPG key management
│   └── cleaner.sh         # Cleanup logic
├── config/
│   ├── gitconfig.template # Global .gitconfig template
│   └── gitignore.template # Global .gitignore template
└── tests/
    └── test_setup.sh      # Functional test suite
```

## Contributing

Pull requests welcome. For major changes, open an issue first.

## License

[MIT](LICENSE)
