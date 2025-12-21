#!/bin/bash
# ==============================================================================
# File:        lib/git_manager.sh
# Description: Manages global Git configuration, ignore files, and hooks.
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

# Function: git_configure_global
# Description: Applies the global .gitconfig from template.
# Arguments:
#   $1 - Template path
git_configure_global() {
    local template="$1"
    local destination="$HOME/.gitconfig"

    log_info "Configuring global .gitconfig..."
    
    if [[ ! -f "$template" ]]; then
        log_error "Git config template missing: $template" 1
    fi

    utils_backup_file "$destination"

    # Restrict envsubst to specific variables to avoid accidental replacements
    # (though less risky in .gitconfig than in hooks)
    export GIT_USER_NAME GIT_USER_EMAIL_DEFAULT GIT_CORE_EDITOR
    envsubst < "$template" > "$destination"

    log_success "Global Git config updated."
}

# Function: git_configure_ignore
# Description: Applies the global .gitignore from template.
# Arguments:
#   $1 - Template path
git_configure_ignore() {
    local template="$1"
    local destination="$HOME/.gitignore_global"

    log_info "Configuring global .gitignore..."
    utils_backup_file "$destination"
    cp "$template" "$destination"
    log_success "Global .gitignore updated."
}

# Function: git_install_hooks
# Description: Installs the auto-email switching hook.
# Arguments:
#   $1 - Template path
git_install_hooks() {
    local template="$1"
    local template_dir="$HOME/.git_template/hooks"
    local hook_script="$template_dir/post-checkout"

    log_info "Installing Git hooks..."

    mkdir -p "$template_dir"

    # We need to tell envsubst EXACTLY which variables to replace.
    # If we don't, it will erase internal bash variables like $remote_url in the hook.
    local vars_to_subst='$GITHUB_HOST $GITHUB_EMAIL $GITLAB_HOST $GITLAB_EMAIL $GIT_USER_EMAIL_DEFAULT'

    # Generate the hook script
    envsubst "$vars_to_subst" < "$template" > "$hook_script"
    chmod +x "$hook_script"

    # Copy the hook to other relevant lifecycle events
    local hooks=("post-commit" "post-merge" "post-pull")
    for h in "${hooks[@]}"; do
        cp "$hook_script" "$template_dir/$h"
    done

    # Tell Git to use this template directory
    git config --global init.templatedir "$HOME/.git_template"

    log_success "Git hooks installed in $template_dir"
}
