#!/bin/bash
# File: gpg_manager.sh
# Description: Manages GPG signing configuration for Git.
# Author: Noé Henchoz
# License: MIT
# Copyright (c) 2026 Noé Henchoz

# Function: gpg_setup
# Description: Main entry point for GPG setup.
gpg_setup() {
    log_info "--- GPG Configuration ---"

    if [[ "${ENABLE_GPG_SIGNING}" != "true" ]]; then
        log_info "GPG signing is disabled in configuration."
        return 0
    fi

    # Helper to process each email
    _gpg_ensure_key_for_email() {
        local email="$1"
        local key_id

        log_info "Checking GPG key for $email..."
        key_id=$(_gpg_find_key "$email")

        if [[ -z "$key_id" ]]; then
             log_warning "No GPG key found for $email."

             if utils_confirm "Do you want to generate a new GPG key for $email now?"; then
                 # Interactive generation
                 if [[ "${GITSETUP_DRY_RUN}" != "true" ]]; then
                     if "$GPG_PROGRAM" --full-generate-key; then
                         log_success "GPG key generation complete for $email."
                         # Re-scan for the key
                         key_id=$(_gpg_find_key "$email")
                     else
                         log_error "GPG key generation failed for $email." 1
                     fi
                 else
                     log_warning "[DRY-RUN] Would run: $GPG_PROGRAM --full-generate-key"
                 fi
             fi
        else
            log_info "Found GPG key for $email: $key_id"
        fi

        # Display Public Key
        if [[ -n "$key_id" ]]; then
            echo
            log_info "Public Key for $email:"
            echo "--------------------------------------------------------------------------------"
            if [[ "${GITSETUP_DRY_RUN}" != "true" ]]; then
                "$GPG_PROGRAM" --armor --export "$key_id"
            else
                log_warning "[DRY-RUN] Would export public key for $key_id"
            fi
            echo "--------------------------------------------------------------------------------"
            echo
        fi
    }

    # 1. Ensure key for Default Email
    _gpg_ensure_key_for_email "$GIT_USER_EMAIL_DEFAULT"

    # 2. Ensure keys for Profile Emails (using the config iterator)
    # We define a temporary callback wrapper
    _gpg_profile_callback() {
        local host="$1"
        local email="$2"
        # Avoid re-checking default email if it appears in profiles
        if [[ "$email" != "$GIT_USER_EMAIL_DEFAULT" ]]; then
            _gpg_ensure_key_for_email "$email"
        fi
    }

    config_for_each_profile _gpg_profile_callback

    # 3. Configure Global Git (Default Identity)
    local default_key_id
    default_key_id=$(_gpg_find_key "$GIT_USER_EMAIL_DEFAULT")

    if [[ -n "$default_key_id" ]]; then
        _gpg_configure_git "$default_key_id"
    else
        log_warning "No default GPG key available. Skipping global GPG config."
    fi
}

# Function: _gpg_find_key
# Description: Finds the GPG key ID for a given email.
# Arguments:
#   $1 - Email address
# Returns: Key ID (long format) or empty string
_gpg_find_key() {
    local email="$1"
    local gpg_cmd="${GPG_PROGRAM:-gpg}"
    local key_id
    if [[ "${GITSETUP_DRY_RUN}" == "true" ]]; then
         :
    fi

    key_id=$("$gpg_cmd" --list-secret-keys --keyid-format LONG "$email" 2>/dev/null | grep "sec" | awk '{print $2}' | cut -d/ -f2 | head -n 1)

    echo "$key_id"
}

# Function: _gpg_configure_git
# Description: Configures global Git settings for GPG.
# Arguments:
#    $1 - Key ID
_gpg_configure_git() {
    local key_id="$1"
    local gpg_cmd="${GPG_PROGRAM:-gpg}"

    # Resolve absolute path to gpg if not already
    if [[ "$gpg_cmd" != /* ]]; then
        gpg_cmd=$(which "$gpg_cmd")
    fi

    log_info "Configuring Git to use GPG key $key_id..."

    utils_execute "Setting user.signingkey" git config --global user.signingkey "$key_id"
    utils_execute "Setting gpg.program" git config --global gpg.program "$gpg_cmd"
    utils_execute "Enabling commit signing" git config --global commit.gpgsign true

    # Also useful for tag signing
    utils_execute "Enabling tag signing" git config --global tag.gpgsign true

    log_success "Git GPG signing configured."
}
