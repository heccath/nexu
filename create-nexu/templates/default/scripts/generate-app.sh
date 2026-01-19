#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
APPS_DIR="$ROOT_DIR/apps"
DOCKER_DIR="$ROOT_DIR/docker"

# Show usage
if [ -z "$1" ]; then
  echo -e "${BLUE}Usage:${NC} pnpm generate:app <app-name> [port]"
  echo ""
  echo -e "${BLUE}Exemples:${NC}"
  echo "  pnpm generate:app web 3000"
  echo "  pnpm generate:app api 4000"
  exit 1
fi

APP_NAME=$1
PORT=${2:-3000}
APP_DIR="$APPS_DIR/$APP_NAME"

# Check if app already exists
if [ -d "$APP_DIR" ]; then
  echo -e "${RED}Error:${NC} L'application '$APP_NAME' existe déjà dans apps/"
  exit 1
fi

echo -e "${BLUE}Creating${NC} app: $APP_NAME (port: $PORT)"

# Create app directory structure
mkdir -p "$APP_DIR/src"
mkdir -p "$APP_DIR/docker"

# Create Dockerfile
cat > "$APP_DIR/docker/Dockerfile" << EOF
# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ====== Dependencies ======
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/$APP_NAME/package.json ./apps/$APP_NAME/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# ====== Development ======
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/$APP_NAME
EXPOSE $PORT
CMD ["pnpm", "dev"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/$APP_NAME

# ====== Production ======
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/$APP_NAME/dist ./dist
COPY --from=builder /app/apps/$APP_NAME/package.json ./

RUN npm install --omit=dev

EXPOSE $PORT
CMD ["node", "dist/index.js"]
EOF

# Create docker-compose.yml for the app
cat > "$APP_DIR/docker-compose.yml" << EOF
services:
  $APP_NAME:
    build:
      context: ../..
      dockerfile: apps/$APP_NAME/docker/Dockerfile
      target: development
    ports:
      - "$PORT:$PORT"
    environment:
      - NODE_ENV=development
      - PORT=$PORT
    volumes:
      - ../../apps/$APP_NAME:/app/apps/$APP_NAME
      - ../../packages:/app/packages
      - /app/node_modules
      - /app/apps/$APP_NAME/node_modules
    command: pnpm dev
EOF

# Create docker-compose.prod.yml for the app
cat > "$APP_DIR/docker-compose.prod.yml" << EOF
services:
  $APP_NAME:
    build:
      context: ../..
      dockerfile: apps/$APP_NAME/docker/Dockerfile
      target: production
    ports:
      - "$PORT:$PORT"
    environment:
      - NODE_ENV=production
      - PORT=$PORT
    restart: unless-stopped
EOF

# Update main docker-compose.yml
update_main_compose() {
  MAIN_COMPOSE="$DOCKER_DIR/docker-compose.yml"
  INCLUDE_PATH="../apps/$APP_NAME/docker-compose.yml"

  # Create main compose if it doesn't exist
  if [ ! -f "$MAIN_COMPOSE" ]; then
    cat > "$MAIN_COMPOSE" << MAINEOF
# Main docker-compose - includes all apps
# Each app has its own docker-compose.yml in apps/<app-name>/

include:
  - path: $INCLUDE_PATH
MAINEOF
    return
  fi

  # Check if app is already included
  if grep -q "apps/$APP_NAME/docker-compose.yml" "$MAIN_COMPOSE" 2>/dev/null; then
    return
  fi

  # If include is empty array [], replace it
  if grep -q "include: \[\]" "$MAIN_COMPOSE"; then
    sed -i '' "s|include: \[\]|include:\n  - path: $INCLUDE_PATH|" "$MAIN_COMPOSE"
  else
    # Append to existing include list
    echo "  - path: $INCLUDE_PATH" >> "$MAIN_COMPOSE"
  fi
}

update_main_compose

echo -e "${GREEN}✓${NC} Created app: apps/$APP_NAME"
echo ""
echo -e "${YELLOW}Files created:${NC}"
echo "  - apps/$APP_NAME/docker/Dockerfile"
echo "  - apps/$APP_NAME/docker-compose.yml"
echo "  - apps/$APP_NAME/docker-compose.prod.yml"
echo ""
echo -e "${YELLOW}Commands:${NC}"
echo "  Dev (app only):  cd apps/$APP_NAME && docker compose up"
echo "  Dev (all apps):  pnpm docker:dev"
echo "  Prod (app only): cd apps/$APP_NAME && docker compose -f docker-compose.prod.yml up -d"
