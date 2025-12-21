#!/bin/bash
# ==============================================================================
# File:        lib/config.sh
# Description: Loads and validates configuration variables from .env file.
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

# Function: config_load
# Description: Sources the .env file if it exists.
# Arguments:
#   $1 - Path to the .env file
config_load() {
    local env_path="$1"

    if [[ ! -f "$env_path" ]]; then
        log_error "Configuration file not found at: $env_path"
        log_warning "Please copy .env.example to .env and adjust your settings."
        return 1
    fi

    # Source the file to load variables into the current shell scope
    # shellcheck source=/dev/null
    source "$env_path"
    
    log_success "Configuration loaded from $env_path"
    return 0
}

# Function: config_validate
# Description: Ensures critical variables are set.
# Returns: 0 if valid, 1 otherwise.
config_validate() {
    local missing_var=0

    # List of required variables
    local required_vars=(
        "GIT_USER_NAME"
        "GIT_USER_EMAIL_DEFAULT"
        "GIT_PROFILES"
        "GIT_CORE_EDITOR"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Missing required configuration variable: $var"
            missing_var=1
        fi
    done

    if [[ $missing_var -eq 1 ]]; then
        log_error "Configuration validation failed. Check your .env file." 1
    fi
    
    return 0
}

# Function: config_for_each_profile
# Description: Iterates over the GIT_PROFILES list and executes a callback for each.
# Arguments:
#   $1 - Name of the callback function to call.
#        The callback will receive two arguments: host and email.
config_for_each_profile() {
    local callback="$1"
    
    if [[ -z "$GIT_PROFILES" ]]; then
        return 0
    fi

    # Split credentials string by comma
    IFS=',' read -ra PROFILES <<< "$GIT_PROFILES"

    for profile in "${PROFILES[@]}"; do
        # Split each profile by colon
        IFS=':' read -r host email <<< "$profile"
        
        # Trim whitespace using xargs
        host=$(echo "$host" | xargs)
        email=$(echo "$email" | xargs)

        if [[ -n "$host" && -n "$email" ]]; then
            $callback "$host" "$email"
        fi
    done
}
