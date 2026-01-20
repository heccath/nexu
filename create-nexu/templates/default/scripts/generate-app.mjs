#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';
import { detectPackageManager, getRunCommand } from './lib/package-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}!${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

// Get directories
const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const DOCKER_DIR = path.join(ROOT_DIR, 'docker');

// Detect package manager
const pm = detectPackageManager(ROOT_DIR);
const runCmd = getRunCommand(pm);

// Framework configurations
const FRAMEWORKS = {
  // Frontend frameworks
  'next': {
    name: 'Next.js',
    type: 'frontend',
    defaultPort: 3000,
    createCommand: (name) => `npx create-next-app@latest ${name} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-${pm}`,
    devCommand: 'dev',
    buildCommand: 'build',
    startCommand: 'start',
    outputDir: '.next',
    dockerfile: 'nextjs',
  },
  'vite-react': {
    name: 'Vite + React',
    type: 'frontend',
    defaultPort: 5173,
    createCommand: (name) => `npm create vite@latest ${name} -- --template react-ts`,
    devCommand: 'dev --host',
    buildCommand: 'build',
    startCommand: 'preview --host',
    outputDir: 'dist',
    dockerfile: 'vite',
  },
  'vite-vue': {
    name: 'Vite + Vue',
    type: 'frontend',
    defaultPort: 5173,
    createCommand: (name) => `npm create vite@latest ${name} -- --template vue-ts`,
    devCommand: 'dev --host',
    buildCommand: 'build',
    startCommand: 'preview --host',
    outputDir: 'dist',
    dockerfile: 'vite',
  },
  'vite-svelte': {
    name: 'Vite + Svelte',
    type: 'frontend',
    defaultPort: 5173,
    createCommand: (name) => `npm create vite@latest ${name} -- --template svelte-ts`,
    devCommand: 'dev --host',
    buildCommand: 'build',
    startCommand: 'preview --host',
    outputDir: 'dist',
    dockerfile: 'vite',
  },
  'nuxt': {
    name: 'Nuxt',
    type: 'frontend',
    defaultPort: 3000,
    createCommand: (name) => `npx nuxi@latest init ${name}`,
    devCommand: 'dev',
    buildCommand: 'build',
    startCommand: 'preview',
    outputDir: '.output',
    dockerfile: 'nuxt',
  },
  // Backend frameworks
  'express': {
    name: 'Express.js',
    type: 'backend',
    defaultPort: 4000,
    createCommand: null, // Manual setup
    devCommand: 'dev',
    buildCommand: 'build',
    startCommand: 'start',
    outputDir: 'dist',
    dockerfile: 'node',
    dependencies: ['express', 'cors', 'helmet'],
    devDependencies: ['@types/express', '@types/cors', 'tsx', 'typescript'],
  },
  'fastify': {
    name: 'Fastify',
    type: 'backend',
    defaultPort: 4000,
    createCommand: null,
    devCommand: 'dev',
    buildCommand: 'build',
    startCommand: 'start',
    outputDir: 'dist',
    dockerfile: 'node',
    dependencies: ['fastify', '@fastify/cors'],
    devDependencies: ['tsx', 'typescript'],
  },
  'hono': {
    name: 'Hono',
    type: 'backend',
    defaultPort: 4000,
    createCommand: null,
    devCommand: 'dev',
    buildCommand: 'build',
    startCommand: 'start',
    outputDir: 'dist',
    dockerfile: 'node',
    dependencies: ['hono', '@hono/node-server'],
    devDependencies: ['tsx', 'typescript'],
  },
  'nestjs': {
    name: 'NestJS',
    type: 'backend',
    defaultPort: 4000,
    createCommand: (name) => `npx @nestjs/cli@latest new ${name} --package-manager ${pm} --skip-git`,
    devCommand: 'start:dev',
    buildCommand: 'build',
    startCommand: 'start:prod',
    outputDir: 'dist',
    dockerfile: 'node',
  },
  'empty': {
    name: 'Empty (Node.js)',
    type: 'backend',
    defaultPort: 3000,
    createCommand: null,
    devCommand: 'dev',
    buildCommand: 'build',
    startCommand: 'start',
    outputDir: 'dist',
    dockerfile: 'node',
    dependencies: [],
    devDependencies: ['tsx', 'typescript'],
  },
};

// Dockerfile templates
const DOCKERFILES = {
  nextjs: (appName, port) => `# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
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
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
WORKDIR /app/apps/${appName}
ENV PORT=${port}
EXPOSE ${port}
CMD ["pnpm", "dev"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo build --filter=@repo/${appName}

# ====== Production ======
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=${port}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/${appName}/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/${appName}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${appName}/.next/static ./.next/static

USER nextjs
EXPOSE ${port}
CMD ["node", "server.js"]
`,

  vite: (appName, port) => `# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
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
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
WORKDIR /app/apps/${appName}
EXPOSE ${port}
CMD ["pnpm", "dev", "--host"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/${appName}

# ====== Production ======
FROM nginx:alpine AS production
COPY --from=builder /app/apps/${appName}/dist /usr/share/nginx/html
COPY apps/${appName}/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]
`,

  nuxt: (appName, port) => `# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
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
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
WORKDIR /app/apps/${appName}
ENV PORT=${port}
EXPOSE ${port}
CMD ["pnpm", "dev"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/${appName}

# ====== Production ======
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}

COPY --from=builder /app/apps/${appName}/.output ./

EXPOSE ${port}
CMD ["node", "server/index.mjs"]
`,

  node: (appName, port) => `# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
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
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
WORKDIR /app/apps/${appName}
ENV PORT=${port}
EXPOSE ${port}
CMD ["pnpm", "dev"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/${appName}/node_modules ./apps/${appName}/node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/${appName}

# ====== Production ======
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}

COPY --from=builder /app/apps/${appName}/dist ./dist
COPY --from=builder /app/apps/${appName}/package.json ./

RUN npm install --omit=dev

EXPOSE ${port}
CMD ["node", "dist/index.js"]
`,
};

// Helper to ask questions
function question(prompt, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const defaultText = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`${colors.cyan}?${colors.reset} ${prompt}${defaultText}: `, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

// Helper to select from list
async function select(prompt, choices) {
  console.log(`\n${colors.cyan}?${colors.reset} ${prompt}\n`);

  choices.forEach((choice, index) => {
    console.log(`  ${colors.cyan}${index + 1}${colors.reset}) ${choice.name}`);
  });

  console.log('');
  const answer = await question('Enter number', '1');
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < choices.length) {
    return choices[index].value;
  }

  return choices[0].value;
}

// Create backend app manually
function createBackendApp(appDir, appName, framework, port) {
  const config = FRAMEWORKS[framework];

  // Create directory structure
  fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: `@repo/${appName}`,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      lint: 'eslint src/',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {},
    devDependencies: {
      '@repo/typescript-config': 'workspace:*',
    },
  };

  // Add framework-specific dependencies
  if (config.dependencies) {
    for (const dep of config.dependencies) {
      packageJson.dependencies[dep] = 'latest';
    }
  }
  if (config.devDependencies) {
    for (const dep of config.devDependencies) {
      packageJson.devDependencies[dep] = 'latest';
    }
  }

  fs.writeFileSync(
    path.join(appDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create tsconfig.json
  const tsconfig = {
    extends: '@repo/typescript-config/node.json',
    compilerOptions: {
      outDir: 'dist',
      rootDir: 'src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  fs.writeFileSync(
    path.join(appDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  // Create main file based on framework
  let mainFile = '';

  if (framework === 'express') {
    mainFile = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || ${port};

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from ${appName}!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`🚀 Server running on http://localhost:\${port}\`);
});
`;
  } else if (framework === 'fastify') {
    mainFile = `import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });
const port = parseInt(process.env.PORT || '${port}', 10);

await fastify.register(cors);

fastify.get('/', async () => {
  return { message: 'Hello from ${appName}!' };
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

try {
  await fastify.listen({ port, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
`;
  } else if (framework === 'hono') {
    mainFile = `import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
const port = parseInt(process.env.PORT || '${port}', 10);

app.use('*', cors());

app.get('/', (c) => {
  return c.json({ message: 'Hello from ${appName}!' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

console.log(\`🚀 Server running on http://localhost:\${port}\`);

serve({
  fetch: app.fetch,
  port,
});
`;
  } else {
    // Empty template
    mainFile = `const port = process.env.PORT || ${port};

console.log(\`🚀 App ${appName} starting on port \${port}\`);

// Add your code here
`;
  }

  fs.writeFileSync(path.join(appDir, 'src', 'index.ts'), mainFile);
}

// Create nginx config for Vite apps
function createNginxConfig(appDir, port) {
  const nginxConfig = `server {
    listen ${port};
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
`;

  fs.mkdirSync(path.join(appDir, 'docker'), { recursive: true });
  fs.writeFileSync(path.join(appDir, 'docker', 'nginx.conf'), nginxConfig);
}

// Create docker-compose files
function createDockerComposeFiles(appDir, appName, port, framework) {
  const config = FRAMEWORKS[framework];

  // docker-compose.yml (dev)
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
    command: pnpm ${config.devCommand}
`;

  fs.writeFileSync(path.join(appDir, 'docker-compose.yml'), dockerCompose);

  // docker-compose.prod.yml
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

  fs.writeFileSync(path.join(appDir, 'docker-compose.prod.yml'), dockerComposeProd);
}

// Update main docker-compose.yml
function updateMainCompose(appName) {
  const mainComposePath = path.join(DOCKER_DIR, 'docker-compose.yml');
  const includePath = `../apps/${appName}/docker-compose.yml`;

  if (!fs.existsSync(DOCKER_DIR)) {
    fs.mkdirSync(DOCKER_DIR, { recursive: true });
  }

  if (!fs.existsSync(mainComposePath)) {
    const content = `# Main docker-compose - includes all apps
# Each app has its own docker-compose.yml in apps/<app-name>/

include:
  - path: ${includePath}
`;
    fs.writeFileSync(mainComposePath, content);
    return;
  }

  let content = fs.readFileSync(mainComposePath, 'utf-8');

  if (content.includes(`apps/${appName}/docker-compose.yml`)) {
    return;
  }

  if (content.includes('include: []')) {
    content = content.replace('include: []', `include:\n  - path: ${includePath}`);
    fs.writeFileSync(mainComposePath, content);
  } else {
    content = content.trimEnd() + `\n  - path: ${includePath}\n`;
    fs.writeFileSync(mainComposePath, content);
  }
}

// Run command
function run(cmd, cwd) {
  console.log(`${colors.blue}>${colors.reset} ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

// Main function
async function main() {
  log.title('🚀 Generate New App');

  // Get arguments
  const args = process.argv.slice(2);
  let appName = args[0];
  let framework = args[1];
  let port = args[2];

  // If no app name provided, ask for it
  if (!appName) {
    appName = await question('App name');
    if (!appName) {
      log.error('App name is required');
      process.exit(1);
    }
  }

  const APP_DIR = path.join(APPS_DIR, appName);

  // Check if app already exists
  if (fs.existsSync(APP_DIR)) {
    log.error(`App '${appName}' already exists in apps/`);
    process.exit(1);
  }

  // If no framework provided, show selection
  if (!framework) {
    const choices = Object.entries(FRAMEWORKS).map(([key, value]) => ({
      name: `${value.name} (${value.type})`,
      value: key,
    }));

    framework = await select('Select framework', choices);
  }

  // Validate framework
  if (!FRAMEWORKS[framework]) {
    log.error(`Unknown framework: ${framework}`);
    log.info('Available frameworks: ' + Object.keys(FRAMEWORKS).join(', '));
    process.exit(1);
  }

  const config = FRAMEWORKS[framework];

  // Get port
  if (!port) {
    port = await question('Port', config.defaultPort.toString());
  }
  port = parseInt(port, 10);

  log.info(`Creating ${config.name} app: ${appName} (port: ${port})`);
  console.log('');

  // Create app
  if (config.createCommand) {
    // Use framework's CLI
    log.info(`Running ${config.name} installer...`);

    // Create apps directory if needed
    if (!fs.existsSync(APPS_DIR)) {
      fs.mkdirSync(APPS_DIR, { recursive: true });
    }

    try {
      run(config.createCommand(appName), APPS_DIR);
    } catch (error) {
      log.error(`Failed to create app with ${config.name} CLI`);
      process.exit(1);
    }

    // Update package.json name to use @repo/ prefix
    const pkgPath = path.join(APP_DIR, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkg.name = `@repo/${appName}`;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }
  } else {
    // Manual setup for backend frameworks
    log.info(`Setting up ${config.name} app manually...`);
    createBackendApp(APP_DIR, appName, framework, port);
  }

  // Create docker directory
  fs.mkdirSync(path.join(APP_DIR, 'docker'), { recursive: true });

  // Create Dockerfile
  const dockerfileContent = DOCKERFILES[config.dockerfile](appName, port);
  fs.writeFileSync(path.join(APP_DIR, 'docker', 'Dockerfile'), dockerfileContent);

  // Create nginx config for Vite apps
  if (config.dockerfile === 'vite') {
    createNginxConfig(APP_DIR, port);
  }

  // Create docker-compose files
  createDockerComposeFiles(APP_DIR, appName, port, framework);

  // Update main docker-compose
  updateMainCompose(appName);

  // Install dependencies if it was a manual setup
  if (!config.createCommand) {
    log.info('Installing dependencies...');
    try {
      run(`${pm} install`, ROOT_DIR);
    } catch (error) {
      log.warn('Failed to install dependencies. Run install manually.');
    }
  }

  // Success message
  console.log('');
  log.success(`Created app: apps/${appName}`);
  console.log('');
  console.log(`${colors.cyan}Files created:${colors.reset}`);
  console.log(`  - apps/${appName}/`);
  console.log(`  - apps/${appName}/docker/Dockerfile`);
  console.log(`  - apps/${appName}/docker-compose.yml`);
  console.log(`  - apps/${appName}/docker-compose.prod.yml`);
  if (config.dockerfile === 'vite') {
    console.log(`  - apps/${appName}/docker/nginx.conf`);
  }
  console.log('');
  console.log(`${colors.cyan}Commands:${colors.reset}`);
  console.log(`  Dev (local):     cd apps/${appName} && ${runCmd} dev`);
  console.log(`  Dev (docker):    cd apps/${appName} && docker compose up`);
  console.log(`  Dev (all apps):  ${runCmd} docker:dev`);
  console.log(`  Build:           ${runCmd} build --filter=@repo/${appName}`);
  console.log('');
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
