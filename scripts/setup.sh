#!/bin/bash

set -e

echo "🚀 Setting up monorepo..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup husky
echo "🐶 Setting up Husky..."
pnpm prepare

# Create environment files
echo "🔐 Creating environment files..."

if [ ! -f ".env" ]; then
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexu
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=nexu

# API
API_URL=http://localhost:4000

# App
NODE_ENV=development
EOF
    echo "✅ Created .env file"
fi

if [ ! -f "apps/web/.env.local" ]; then
    cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
EOF
    echo "✅ Created apps/web/.env.local"
fi

if [ ! -f "apps/api/.env" ]; then
    cat > apps/api/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexu
PORT=4000
NODE_ENV=development
EOF
    echo "✅ Created apps/api/.env"
fi

# Build packages
echo "🔨 Building packages..."
pnpm build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Available commands:"
echo "  pnpm dev          - Start development servers"
echo "  pnpm build        - Build all packages"
echo "  pnpm lint         - Run linting"
echo "  pnpm test         - Run tests"
echo "  pnpm docker:dev   - Start with Docker (dev)"
echo ""
