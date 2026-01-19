#!/bin/bash

# Publish create-nexu CLI to npm
# This script generates the template, builds, and publishes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$ROOT_DIR/create-nexu"

echo "📦 Publishing create-nexu..."
echo ""

# Step 1: Generate template
echo "1️⃣  Generating template..."
"$SCRIPT_DIR/generate-template.sh"
echo ""

# Step 2: Build CLI
echo "2️⃣  Building CLI..."
cd "$CLI_DIR"
pnpm build
echo ""

# Step 3: Run checks
echo "3️⃣  Running checks..."
pnpm typecheck
pnpm lint
echo "✅ All checks passed"
echo ""

# Step 4: Version bump
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "4️⃣  Current version: $CURRENT_VERSION"
echo ""
echo "Select version bump:"
echo "  1) patch (bug fixes)"
echo "  2) minor (new features)"
echo "  3) major (breaking changes)"
echo "  4) skip (keep current version)"
echo ""
read -p "Choice [1-4]: " -n 1 -r VERSION_CHOICE
echo ""

case $VERSION_CHOICE in
    1)
        npm version patch --no-git-tag-version
        ;;
    2)
        npm version minor --no-git-tag-version
        ;;
    3)
        npm version major --no-git-tag-version
        ;;
    4)
        echo "Keeping version $CURRENT_VERSION"
        ;;
    *)
        echo "Invalid choice, keeping current version"
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "Version: $NEW_VERSION"
echo ""

# Step 5: Show package info
echo "5️⃣  Package info:"
cat package.json | grep -E '"name"|"version"'
echo ""

# Step 6: Confirm publish
read -p "Publish v$NEW_VERSION to npm? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "6️⃣  Publishing to npm..."
    npm publish --access public
    echo ""
    echo "✅ Published create-nexu@$NEW_VERSION successfully!"
    echo ""
    echo "Users can now run:"
    echo "  npm create nexu my-app"
    echo "  # or"
    echo "  npx create-nexu my-app"
else
    echo "❌ Publish cancelled"
    # Revert version if changed
    if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
        npm version "$CURRENT_VERSION" --no-git-tag-version --allow-same-version
        echo "Version reverted to $CURRENT_VERSION"
    fi
fi
