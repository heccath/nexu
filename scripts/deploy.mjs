#!/usr/bin/env node

import { execSync } from 'child_process';

const environment = process.argv[2] || 'staging';

console.log(`🚀 Deploying to ${environment}...`);

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

// Build all packages
console.log('🔨 Building packages...');
run('pnpm build');

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
