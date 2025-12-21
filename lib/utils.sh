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

# Function: utils_confirm
# Description: Prompts the user for confirmation (Y/n).
# Arguments:
#   $1 - The message to display
# Returns: 0 if confirmed (or --yes set), 1 if denied.
utils_confirm() {
    local message="$1"

    # Bypass if --yes flag is set
    if [[ "${GITSETUP_ASSUME_YES:-false}" == "true" ]]; then
        return 0
    fi
    
    echo -n "${_COLOR_YELLOW}[?] $message (y/N) ${_COLOR_RESET}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function: utils_update_block_from_stdin
# Description: Replaces a block delimited by markers in a file, or appends it.
#              Preserves the position of the existing block.
# Arguments:
#   $1 - Target file path
#   $2 - Start marker line
#   $3 - End marker line
# Input: The new content of the block (from stdin)
utils_update_block_from_stdin() {
    local file="$1"
    local start_marker="$2"
    local end_marker="$3"
    local new_content
    # Read stdin into a variable
    new_content=$(cat)

    local tmp_file="${file}.tmp"
    local found=0
    local writing=1

    # 1. File doesn't exist? Create it.
    if [[ ! -f "$file" ]]; then
        if [[ -n "$new_content" ]]; then
            echo "$start_marker" > "$tmp_file"
            echo "$new_content" >> "$tmp_file"
            echo "$end_marker" >> "$tmp_file"
            mv "$tmp_file" "$file"
            log_info "Created new file: $file"
        fi
        return 0
    fi

    # 2. Check if block exists
    # We use a temporary file to rebuild the content
    rm -f "$tmp_file"
    touch "$tmp_file"

    if grep -Fq "$start_marker" "$file"; then
        # Block exists: Replace it in-place
        while IFS= read -r line || [[ -n "$line" ]]; do
            if [[ "$line" == "$start_marker" ]]; then
                writing=0
                found=1
                # Inject new block
                if [[ -n "$new_content" ]]; then
                    echo "$start_marker" >> "$tmp_file"
                    echo "$new_content" >> "$tmp_file"
                    echo "$end_marker" >> "$tmp_file"
                fi
            fi

            if [[ "$writing" -eq 1 ]]; then
                echo "$line" >> "$tmp_file"
            fi

            if [[ "$line" == "$end_marker" ]]; then
                writing=1
            fi
        done < "$file"
        
        log_info "Updated existing block in $file"
    else
        # Block missing: Append
        cp "$file" "$tmp_file"
        # Ensure newline at end before appending
        [[ -s "$tmp_file" && -n "$(tail -c 1 "$tmp_file")" ]] && echo "" >> "$tmp_file"
        
        if [[ -n "$new_content" ]]; then
            echo "$start_marker" >> "$tmp_file"
            echo "$new_content" >> "$tmp_file"
            echo "$end_marker" >> "$tmp_file"
            log_info "Appended new configuration block to $file"
        fi
    fi

    mv "$tmp_file" "$file"
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
            return "$status" 
        fi
    fi
}
