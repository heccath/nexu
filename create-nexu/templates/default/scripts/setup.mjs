#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  detectPackageManager,
  isPackageManagerInstalled,
  getInstallCommand,
  getRunCommand,
} from './lib/package-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Detect package manager
const pm = detectPackageManager(ROOT_DIR);
const runCmd = getRunCommand(pm);

console.log('🚀 Setting up monorepo...');
console.log(`📦 Using package manager: ${pm}`);

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
}

// Check if package manager is installed
if (!isPackageManagerInstalled(pm)) {
  console.log(`📦 Installing ${pm}...`);
  if (pm === 'pnpm') {
    run('npm install -g pnpm');
  } else if (pm === 'yarn') {
    run('npm install -g yarn');
  }
}

// Install dependencies
console.log('📦 Installing dependencies...');
run(getInstallCommand(pm));

// Setup husky
console.log('🐶 Setting up Husky...');
run(`${runCmd} prepare`);

// Create environment files
console.log('🔐 Creating environment files...');

const envPath = path.join(ROOT_DIR, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexu
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=nexu

# API
API_URL=http://localhost:4000

# App
NODE_ENV=development
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file');
}

const webEnvPath = path.join(ROOT_DIR, 'apps', 'web', '.env.local');
const webAppsDir = path.join(ROOT_DIR, 'apps', 'web');
if (fs.existsSync(webAppsDir) && !fs.existsSync(webEnvPath)) {
  const webEnvContent = `NEXT_PUBLIC_API_URL=http://localhost:4000
`;
  fs.writeFileSync(webEnvPath, webEnvContent);
  console.log('✅ Created apps/web/.env.local');
}

const apiEnvPath = path.join(ROOT_DIR, 'apps', 'api', '.env');
const apiAppsDir = path.join(ROOT_DIR, 'apps', 'api');
if (fs.existsSync(apiAppsDir) && !fs.existsSync(apiEnvPath)) {
  const apiEnvContent = `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexu
PORT=4000
NODE_ENV=development
`;
  fs.writeFileSync(apiEnvPath, apiEnvContent);
  console.log('✅ Created apps/api/.env');
}

// Build packages
console.log('🔨 Building packages...');
run(`${runCmd} build`);

console.log('');
console.log('✅ Setup complete!');
console.log('');
console.log('Available commands:');
console.log(`  ${runCmd} dev          - Start development servers`);
console.log(`  ${runCmd} build        - Build all packages`);
console.log(`  ${runCmd} lint         - Run linting`);
console.log(`  ${runCmd} test         - Run tests`);
console.log(`  ${runCmd} docker:dev   - Start with Docker (dev)`);
console.log('');
