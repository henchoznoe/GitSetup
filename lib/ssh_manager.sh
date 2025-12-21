#!/bin/bash
# ==============================================================================
# File:        lib/ssh_manager.sh
# Description: Manages SSH keys generation and configuration file creation.
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

# Function: ssh_ensure_dir
# Description: Creates the .ssh directory with correct permissions.
# Arguments:
#   $1 - Path to the .ssh directory
ssh_ensure_dir() {
    local ssh_dir="$1"

    if [[ ! -d "$ssh_dir" ]]; then
        mkdir -p "$ssh_dir"
        chmod 700 "$ssh_dir"
        log_success "Created SSH directory: $ssh_dir"
    else
        log_info "SSH directory already exists."
    fi
}

# Function: ssh_generate_key
# Description: Generates an ed25519 SSH key if it doesn't exist.
# Arguments:
#   $1 - Email address for the key comment
#   $2 - Full path to the key file
ssh_generate_key() {
    local email="$1"
    local key_path="$2"

    if [[ -f "$key_path" ]]; then
        log_warning "SSH key already exists: $key_path (Skipping generation)"
        return 0
    fi

    log_info "Generating SSH key for $email..."
    ssh-keygen -t ed25519 -C "$email" -f "$key_path" -N "" >/dev/null 2>&1

    if [[ $? -eq 0 ]]; then
        log_success "Generated key: $key_path"
    else
        log_error "Failed to generate SSH key for $email" 1
    fi
}

# Function: ssh_create_config
# Description: Generates ~/.ssh/config from a template using envsubst.
# Arguments:
#   $1 - Path to the template file
#   $2 - Path to the destination config file
ssh_create_config() {
    local template_path="$1"
    local config_path="$2"

    if [[ ! -f "$template_path" ]]; then
        log_error "SSH config template not found: $template_path" 1
    fi

    # Backup existing config using the utils module
    utils_backup_file "$config_path"

    log_info "Generating SSH config file..."
    
    # Use envsubst to replace variables in the template
    # Note: Variables must be exported in the main script to be visible here
    envsubst < "$template_path" > "$config_path"

    if [[ $? -eq 0 ]]; then
        chmod 600 "$config_path"
        log_success "SSH config updated: $config_path"
    else
        log_error "Failed to generate SSH config." 1
    fi
}
