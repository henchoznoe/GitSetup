#!/bin/bash
# ==============================================================================
# File:        lib/logger.sh
# Description: Handles colored output and logging levels.
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

# Use tput for portability, fallback to ANSI if needed
readonly _COLOR_RESET=$(tput sgr0)
readonly _COLOR_RED=$(tput setaf 1)
readonly _COLOR_GREEN=$(tput setaf 2)
readonly _COLOR_YELLOW=$(tput setaf 3)
readonly _COLOR_BLUE=$(tput setaf 4)

# Function: log_info
# Description: Prints an informational message in blue.
# Arguments:
#   $1 - The message to print
log_info() {
    local message="$1"
    printf "${_COLOR_BLUE}[INFO]${_COLOR_RESET} %s\n" "$message"
}

# Function: log_success
# Description: Prints a success message in green.
# Arguments:
#   $1 - The message to print
log_success() {
    local message="$1"
    printf "${_COLOR_GREEN}[OK]${_COLOR_RESET}   %s\n" "$message"
}

# Function: log_warning
# Description: Prints a warning message in yellow.
# Arguments:
#   $1 - The message to print
log_warning() {
    local message="$1"
    printf "${_COLOR_YELLOW}[WARN]${_COLOR_RESET} %s\n" "$message"
}

# Function: log_error
# Description: Prints an error message in red and optionally exits.
# Arguments:
#   $1 - The message to print
#   $2 - (Optional) Exit code. If provided, the script will exit.
log_error() {
    local message="$1"
    local exit_code="${2:-}"

    printf "${_COLOR_RED}[ERR]${_COLOR_RESET}  %s\n" "$message" >&2

    if [[ -n "$exit_code" ]]; then
        exit "$exit_code"
    fi
}
