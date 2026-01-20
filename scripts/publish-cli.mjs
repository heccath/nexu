#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const ROOT_DIR = path.resolve(__dirname, '..');
const CLI_DIR = path.join(ROOT_DIR, 'create-nexu');

// Helper to run commands
function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: options.cwd || ROOT_DIR, ...options });
}

// Helper to prompt user
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('📦 Publishing create-nexu...');
  console.log('');

  // Step 1: Generate template
  console.log('1️⃣  Generating template...');
  run('node scripts/generate-template.mjs');
  console.log('');

  // Step 2: Build CLI
  console.log('2️⃣  Building CLI...');
  run('pnpm build', { cwd: CLI_DIR });
  console.log('');

  // Step 3: Run checks
  console.log('3️⃣  Running checks...');
  run('pnpm typecheck', { cwd: CLI_DIR });
  run('pnpm lint', { cwd: CLI_DIR });
  console.log('✅ All checks passed');
  console.log('');

  // Step 4: Version bump
  const packageJsonPath = path.join(CLI_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = pkg.version;

  console.log(`4️⃣  Current version: ${currentVersion}`);
  console.log('');
  console.log('Select version bump:');
  console.log('  1) patch (bug fixes)');
  console.log('  2) minor (new features)');
  console.log('  3) major (breaking changes)');
  console.log('  4) skip (keep current version)');
  console.log('');

  const versionChoice = await prompt('Choice [1-4]: ');

  switch (versionChoice.trim()) {
    case '1':
      run('npm version patch --no-git-tag-version', { cwd: CLI_DIR });
      break;
    case '2':
      run('npm version minor --no-git-tag-version', { cwd: CLI_DIR });
      break;
    case '3':
      run('npm version major --no-git-tag-version', { cwd: CLI_DIR });
      break;
    case '4':
      console.log(`Keeping version ${currentVersion}`);
      break;
    default:
      console.log('Invalid choice, keeping current version');
  }

  // Re-read package.json for new version
  const updatedPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const newVersion = updatedPkg.version;

  console.log('');
  console.log(`Version: ${newVersion}`);
  console.log('');

  // Step 5: Show package info
  console.log('5️⃣  Package info:');
  console.log(`  "name": "${updatedPkg.name}"`);
  console.log(`  "version": "${updatedPkg.version}"`);
  console.log('');

  // Step 6: Confirm publish
  const confirmPublish = await prompt(`Publish v${newVersion} to npm? (y/N) `);

  if (confirmPublish.toLowerCase() === 'y') {
    console.log('6️⃣  Publishing to npm...');
    run('npm publish --access public', { cwd: CLI_DIR });
    console.log('');
    console.log(`✅ Published create-nexu@${newVersion} successfully!`);
    console.log('');
    console.log('Users can now run:');
    console.log('  npm create nexu my-app');
    console.log('  # or');
    console.log('  npx create-nexu my-app');
  } else {
    console.log('❌ Publish cancelled');
    // Revert version if changed
    if (currentVersion !== newVersion) {
      run(`npm version ${currentVersion} --no-git-tag-version --allow-same-version`, { cwd: CLI_DIR });
      console.log(`Version reverted to ${currentVersion}`);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
