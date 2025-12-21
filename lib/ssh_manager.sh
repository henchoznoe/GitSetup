#!/bin/bash
# ==============================================================================
# File:        lib/ssh_manager.sh
# Description: Manages SSH keys and config dynamically based on GIT_PROFILES.
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

# Global buffer to accumulate config
SSH_CONFIG_BUFFER=""

# Internal callback for processing each profile
# Context: Expects $ssh_dir to be defined in current scope
_ssh_process_profile() {
    local host="$1"
    local email="$2"

    # Define consistent key filename: id_ed25519_github_com
    local host_slug
    host_slug=$(utils_sanitize_host "$host")
    local key_name="id_ed25519_${host_slug}"
    local key_path="$ssh_dir/$key_name"

    # 1. Generate Key if missing
    if [[ ! -f "$key_path" ]]; then
        log_info "Generating key for $host ($email)..."
        utils_execute "Generating SSH key: $key_name" ssh-keygen -q -t ed25519 -C "$email" -f "$key_path" -N ""
    else
        log_info "Key exists for $host: $key_name"
    fi

    # 2. Accumulate block for SSH Config
    log_info "-> Preparing config block for $host"
    
    SSH_CONFIG_BUFFER+="# --- $host ---
Host $host
    HostName $host
    User git
    IdentityFile $key_path
    IdentitiesOnly yes

"
}

# Function: ssh_setup_dynamic
# Description: Generates keys and updates the SSH config file safely.
ssh_setup_dynamic() {
    local ssh_dir="$1"
    local config_file="$ssh_dir/config"
    local start_marker="# ==================== GITSETUP START ===================="
    local end_marker="# ==================== GITSETUP END ===================="
    
    # Ensure directory exists
    if [[ ! -d "$ssh_dir" ]]; then
        utils_execute "Creating SSH directory" mkdir -p "$ssh_dir"
        utils_execute "Securing SSH directory" chmod 700 "$ssh_dir"
    fi

    # Config backup handled by utils_update_block_from_stdin internally if we wanted, 
    # but we should backup normally just in case of corruption.
    # Actually utils_update_block_from_stdin doesn't do a timestamped backup, it works in place via temp.
    # So let's backup first.
    if [[ -f "$config_file" ]]; then
        utils_backup_file "$config_file"
    fi

    log_info "Generating SSH configuration..."

    # Reset buffer
    SSH_CONFIG_BUFFER=""

    # Loop through profiles using the common iterator
    config_for_each_profile _ssh_process_profile

    # Update the file block
    if [[ "${GITSETUP_DRY_RUN}" != "true" ]]; then
        echo "$SSH_CONFIG_BUFFER" | utils_update_block_from_stdin "$config_file" "$start_marker" "$end_marker"
        
        # Secure the config file
        utils_execute "Securing SSH config file" chmod 600 "$config_file"
    else
         log_warning "[DRY-RUN] Would update block in $config_file with:"
         echo "$start_marker"
         echo "$SSH_CONFIG_BUFFER"
         echo "$end_marker"
    fi

    log_success "SSH setup complete."
}
