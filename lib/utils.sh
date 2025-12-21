#!/bin/bash
# ==============================================================================
# File:        lib/utils.sh
# Description: Common utility functions for system checks and file manipulation.
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

# Function: utils_check_dependency
# Description: Verifies if a required command is available in the PATH.
# Arguments:
#   $1 - The command name (e.g., "git", "gpg")
utils_check_dependency() {
    local command_name="$1"

    if ! command -v "$command_name" >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Function: utils_backup_file
# Description: Creates a timestamped backup of a file if it exists.
# Arguments:
#   $1 - Path to the file to backup
utils_backup_file() {
    local file_path="$1"
    local timestamp
    timestamp=$(date +%s)
    local backup_path="${file_path}.bak.${timestamp}"

    if [[ -f "$file_path" ]]; then
        log_warning "File '$file_path' already exists."
        utils_execute "Backing up file: $file_path" cp "$file_path" "$backup_path"
        if [[ $? -eq 0 ]]; then
            log_success "Backup created at: $backup_path"
        else
            log_error "Failed to create backup for $file_path" 1
        fi
    fi
}

# Function: utils_is_macos
# Description: Checks if the current OS is macOS (Darwin).
# Returns: 0 if macOS, 1 otherwise.
utils_is_macos() {
    [[ "$(uname)" == "Darwin" ]]
}

# Function: utils_sanitize_host
# Description: Sanitizes a hostname for use in filenames (e.g., github.com -> github_com).
# Arguments:
#   $1 - The hostname to sanitize
utils_sanitize_host() {
    echo "$1" | tr '.' '_'
}

# Function: utils_execute
# Description: Executes a command safely using arrays, or prints it if in DRY_RUN mode.
# Arguments:
#   $1 - Description of the action for logs
#   $@ - The command and its arguments
utils_execute() {
    local description="$1"
    shift
    local cmd=("$@")

    if [[ "${GITSETUP_DRY_RUN:-false}" == "true" ]]; then
        # Dry-run mode: Just print what would happen
        log_warning "[DRY-RUN] $description"
        echo "          Command: ${cmd[*]}"
    else
        # Normal mode: Execute directly without eval
        "${cmd[@]}"
        local status=$?
        if [[ $status -ne 0 ]]; then
            log_error "Command failed: ${cmd[*]}" "$status"
        fi
    fi
}
