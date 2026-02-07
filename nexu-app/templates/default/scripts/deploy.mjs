#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { detectPackageManager, getRunCommand } from './lib/package-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const environment = process.argv[2] || 'staging';
const pm = detectPackageManager(ROOT_DIR);
const runCmd = getRunCommand(pm);

console.log(`🚀 Deploying to ${environment}...`);
console.log(`📦 Using package manager: ${pm}`);

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
}

// Build all packages
console.log('🔨 Building packages...');
run(`${runCmd} build`);

// Build Docker images
console.log('🐳 Building Docker images...');
run('docker-compose -f docker/docker-compose.prod.yml build');

// Push images (if deploying to production)
if (environment === 'production') {
  console.log('📤 Pushing images to registry...');
  run('docker-compose -f docker/docker-compose.prod.yml push');
}

console.log('');
console.log(`✅ Deployment to ${environment} complete!`);
console.log('');
