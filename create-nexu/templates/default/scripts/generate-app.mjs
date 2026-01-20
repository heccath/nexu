#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
};

// Get directories
const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const DOCKER_DIR = path.join(ROOT_DIR, 'docker');

// Get arguments
const args = process.argv.slice(2);
const appName = args[0];
const port = args[1] || '3000';

// Show usage
if (!appName) {
  log.info('Usage: pnpm generate:app <app-name> [port]');
  console.log('');
  log.info('Examples:');
  console.log('  pnpm generate:app web 3000');
  console.log('  pnpm generate:app api 4000');
  process.exit(1);
}

const APP_DIR = path.join(APPS_DIR, appName);

// Check if app already exists
if (fs.existsSync(APP_DIR)) {
  log.error(`Error: L'application '${appName}' existe déjà dans apps/`);
  process.exit(1);
}

log.info(`Creating app: ${appName} (port: ${port})`);

// Create app directory structure
fs.mkdirSync(path.join(APP_DIR, 'src'), { recursive: true });
fs.mkdirSync(path.join(APP_DIR, 'docker'), { recursive: true });

// Create Dockerfile
const dockerfile = `# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ====== Dependencies ======
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/${appName}/package.json ./apps/${appName}/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# ====== Development ======
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/${appName}
EXPOSE ${port}
CMD ["pnpm", "dev"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/${appName}

# ====== Production ======
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/${appName}/dist ./dist
COPY --from=builder /app/apps/${appName}/package.json ./

RUN npm install --omit=dev

EXPOSE ${port}
CMD ["node", "dist/index.js"]
`;

fs.writeFileSync(path.join(APP_DIR, 'docker', 'Dockerfile'), dockerfile);

// Create docker-compose.yml for the app
const dockerCompose = `services:
  ${appName}:
    build:
      context: ../..
      dockerfile: apps/${appName}/docker/Dockerfile
      target: development
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=development
      - PORT=${port}
    volumes:
      - ../../apps/${appName}:/app/apps/${appName}
      - ../../packages:/app/packages
      - /app/node_modules
      - /app/apps/${appName}/node_modules
    command: pnpm dev
`;

fs.writeFileSync(path.join(APP_DIR, 'docker-compose.yml'), dockerCompose);

// Create docker-compose.prod.yml for the app
const dockerComposeProd = `services:
  ${appName}:
    build:
      context: ../..
      dockerfile: apps/${appName}/docker/Dockerfile
      target: production
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=production
      - PORT=${port}
    restart: unless-stopped
`;

fs.writeFileSync(path.join(APP_DIR, 'docker-compose.prod.yml'), dockerComposeProd);

// Update main docker-compose.yml
function updateMainCompose() {
  const mainComposePath = path.join(DOCKER_DIR, 'docker-compose.yml');
  const includePath = `../apps/${appName}/docker-compose.yml`;

  // Create docker directory if it doesn't exist
  if (!fs.existsSync(DOCKER_DIR)) {
    fs.mkdirSync(DOCKER_DIR, { recursive: true });
  }

  // Create main compose if it doesn't exist
  if (!fs.existsSync(mainComposePath)) {
    const content = `# Main docker-compose - includes all apps
# Each app has its own docker-compose.yml in apps/<app-name>/

include:
  - path: ${includePath}
`;
    fs.writeFileSync(mainComposePath, content);
    return;
  }

  // Read existing file
  let content = fs.readFileSync(mainComposePath, 'utf-8');

  // Check if app is already included
  if (content.includes(`apps/${appName}/docker-compose.yml`)) {
    return;
  }

  // If include is empty array [], replace it
  if (content.includes('include: []')) {
    content = content.replace('include: []', `include:\n  - path: ${includePath}`);
    fs.writeFileSync(mainComposePath, content);
  } else {
    // Append to existing include list
    content = content.trimEnd() + `\n  - path: ${includePath}\n`;
    fs.writeFileSync(mainComposePath, content);
  }
}

updateMainCompose();

log.success(`\n✓ Created app: apps/${appName}`);
console.log('');
log.warn('Files created:');
console.log(`  - apps/${appName}/docker/Dockerfile`);
console.log(`  - apps/${appName}/docker-compose.yml`);
console.log(`  - apps/${appName}/docker-compose.prod.yml`);
console.log('');
log.warn('Commands:');
console.log(`  Dev (app only):  cd apps/${appName} && docker compose up`);
console.log('  Dev (all apps):  pnpm docker:dev');
console.log(`  Prod (app only): cd apps/${appName} && docker compose -f docker-compose.prod.yml up -d`);
