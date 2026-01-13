#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Deploying to $ENVIRONMENT..."

# Build all packages
echo "🔨 Building packages..."
pnpm build

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker/docker-compose.prod.yml build

# Push images (if deploying to production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "📤 Pushing images to registry..."
    docker-compose -f docker/docker-compose.prod.yml push
fi

echo ""
echo "✅ Deployment to $ENVIRONMENT complete!"
echo ""
