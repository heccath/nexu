#!/bin/bash

# Generate template for create-nexu CLI
# This script syncs the monorepo files to the template directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$ROOT_DIR/create-nexu/templates/default"

echo "🔄 Generating template..."

# Clean existing template
rm -rf "$TEMPLATE_DIR"
mkdir -p "$TEMPLATE_DIR"

# Copy files using rsync (excluding unwanted files)
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.turbo' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='dist' \
  --exclude='coverage' \
  --exclude='.next' \
  --exclude='pnpm-lock.yaml' \
  --exclude='create-nexu' \
  --exclude='.claude' \
  --exclude='apps/*' \
  --exclude='README.md' \
  --exclude='.lintstagedrc.cjs' \
  "$ROOT_DIR/" "$TEMPLATE_DIR/"

# Create empty apps directory with .gitkeep
mkdir -p "$TEMPLATE_DIR/apps"
touch "$TEMPLATE_DIR/apps/.gitkeep"

# Update package.json with placeholder name
sed -i '' 's/"name": "nexu"/"name": "{{PROJECT_NAME}}"/' "$TEMPLATE_DIR/package.json"

# Remove create-nexu from pnpm-workspace.yaml in template
sed -i '' "/- 'create-nexu'/d" "$TEMPLATE_DIR/pnpm-workspace.yaml"

# Remove create-nexu from .eslintrc.js ignorePatterns in template
sed -i '' "/'create-nexu',/d" "$TEMPLATE_DIR/.eslintrc.js"

# Remove shell scripts from template (only for this repo, we use .js for cross-platform)
rm -f "$TEMPLATE_DIR/scripts/generate-template.sh"
rm -f "$TEMPLATE_DIR/scripts/publish-cli.sh"
rm -f "$TEMPLATE_DIR/scripts/generate-app.sh"

# Remove lint-staged from template package.json (to avoid conflicts with root lint-staged)
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$TEMPLATE_DIR/package.json', 'utf8'));
delete pkg['lint-staged'];
// Also remove generate:template and publish:cli scripts
delete pkg.scripts['generate:template'];
delete pkg.scripts['publish:cli'];
fs.writeFileSync('$TEMPLATE_DIR/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✅ Template generated at: $TEMPLATE_DIR"
echo ""
echo "Files included:"
ls -la "$TEMPLATE_DIR"
