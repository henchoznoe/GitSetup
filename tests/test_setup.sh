#!/bin/bash
# ==============================================================================
# File:        tests/test_setup.sh
# Description: Functional test suite for GitSetup
# Author:      Noé Henchoz <henchoznoe@gmail.com>
# Date:        2025-12-21
# License:     MIT
# ==============================================================================

set -e

# Setup Test Environment
TEST_DIR="$(pwd)/tests/tmp_home"
PROJECT_ROOT="$(pwd)"

echo "🧪 Starting Functional Tests..."
echo "   Test Home: $TEST_DIR"

# Cleanup from previous runs
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Mock HOME
export HOME="$TEST_DIR"

# 1. Prepare Dummy Configuration
cat > "$TEST_DIR/.env" <<EOF
GIT_USER_NAME="Test Bot"
GIT_USER_EMAIL_DEFAULT="bot@example.com"
GIT_PROFILES="test.github.com:bot@github.com"
GIT_CORE_EDITOR="vim"
ENABLE_CONVENTIONAL_COMMITS="true"
ENABLE_GPG_SIGNING="true"
GPG_KEY_ID="ABC12345"
GPG_PROGRAM="echo" # Mock gpg
EOF

export GITSETUP_ENV_FILE="$TEST_DIR/.env"

# ------------------------------------------------------------------------------
# TEST 1: First Run (Fresh Install)
# ------------------------------------------------------------------------------
echo "👉 [TEST 1] Running Setup (Fresh)..."
if ./bin/git-setup --yes; then
    echo "   ✅ Setup exited successfully"
else
    echo "   ❌ Setup failed"
    exit 1
fi

# Assertions
if [[ -f "$HOME/.gitconfig" ]]; then echo "   ✅ .gitconfig created"; else echo "   ❌ .gitconfig missing"; exit 1; fi
if [[ -f "$HOME/.ssh/config" ]]; then echo "   ✅ SSH config created"; else echo "   ❌ SSH config missing"; exit 1; fi

if grep -q "test.github.com" "$HOME/.ssh/config"; then
    echo "   ✅ SSH config contains profile";
else
    echo "   ❌ SSH config missing profile data";
    exit 1
fi

if [[ -f "$HOME/.git_template/hooks/post-checkout" ]]; then echo "   ✅ Hooks installed"; else echo "   ❌ Hooks missing"; exit 1; fi

# Check GPG
if grep -q "signingkey = ABC12345" "$HOME/.gitconfig"; then echo "   ✅ GPG key set"; else echo "   ❌ GPG key missing"; exit 1; fi
if grep -q "gpgsign = true" "$HOME/.gitconfig"; then echo "   ✅ GPG signing enabled"; else echo "   ❌ GPG signing disabled"; exit 1; fi

# ------------------------------------------------------------------------------
# TEST 2: Idempotence (Run again)
# ------------------------------------------------------------------------------
echo "👉 [TEST 2] Running Setup (Idempotence)..."
if ./bin/git-setup --yes; then
    echo "   ✅ Setup 2nd run successful"
else
    echo "   ❌ Setup 2nd run failed"
    exit 1
fi

# Assertions
count=$(grep -c "Host test.github.com" "$HOME/.ssh/config" || true)
if [[ "$count" -eq 1 ]]; then
    echo "   ✅ SSH config block not duplicated";
else
    echo "   ❌ SSH config block duplicated (count: $count)";
    exit 1
fi

# ------------------------------------------------------------------------------
# TEST 3: Non-Destructive Check
# ------------------------------------------------------------------------------
echo "👉 [TEST 3] Non-Destructive behavior..."
# Manually add something to SSH config
echo "# User customization" >> "$HOME/.ssh/config"

./bin/git-setup --yes > /dev/null

if grep -q "# User customization" "$HOME/.ssh/config"; then
    echo "   ✅ User customization preserved";
else
    echo "   ❌ User customization lost";
    exit 1
fi

# ------------------------------------------------------------------------------
# TEST 4: Cleanup Mode
# ------------------------------------------------------------------------------
echo "👉 [TEST 4] Cleanup Mode..."
./bin/git-setup --clean --yes > /dev/null

if grep -q "Host test.github.com" "$HOME/.ssh/config"; then
     echo "   ❌ SSH config block NOT removed";
     exit 1
else
     echo "   ✅ SSH config block removed";
fi

# ------------------------------------------------------------------------------
# Finish
# ------------------------------------------------------------------------------
rm -rf "$TEST_DIR"
echo "🎉 All tests passed!"
