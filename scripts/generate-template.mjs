#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'create-nexu', 'templates', 'default');

// Files/directories to exclude from template
const EXCLUDES = [
  'node_modules',
  '.git',
  '.turbo',
  '*.log',
  '.DS_Store',
  'dist',
  'coverage',
  '.next',
  'pnpm-lock.yaml',
  'create-nexu',
  '.claude',
  'README.md',
  '.lintstagedrc.cjs',
  '.husky/_', // Husky internal files
];

console.log('🔄 Generating template...');

// Clean existing template
if (fs.existsSync(TEMPLATE_DIR)) {
  fs.rmSync(TEMPLATE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

// Function to copy directory recursively with exclusions
function copyDir(src, dest, excludes = []) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(ROOT_DIR, srcPath);

    // Check if should be excluded
    const shouldExclude = excludes.some((pattern) => {
      if (pattern.includes('*')) {
        // Handle glob patterns like *.log
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(entry.name);
      }
      // Exclude node_modules anywhere in the tree
      if (pattern === 'node_modules' && entry.name === 'node_modules') {
        return true;
      }
      // Exclude .husky/_ directory
      if (pattern === '.husky/_' && relativePath.startsWith('.husky/_')) {
        return true;
      }
      return entry.name === pattern || relativePath === pattern || relativePath.startsWith(pattern + '/');
    });

    if (shouldExclude) {
      continue;
    }

    // Special handling for apps directory - only copy structure, not contents
    if (relativePath === 'apps') {
      fs.mkdirSync(destPath, { recursive: true });
      // Use 'gitkeep' instead of '.gitkeep' because npm doesn't publish dotfiles
      fs.writeFileSync(path.join(destPath, 'gitkeep'), '');
      continue;
    }

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath, excludes);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy files
copyDir(ROOT_DIR, TEMPLATE_DIR, EXCLUDES);

// Rename dotfiles (npm doesn't publish .gitignore and .gitkeep files)
const dotfilesToRename = [
  { src: '.gitignore', dest: 'gitignore' },
  { src: path.join('services', 'postgres', 'init', '.gitkeep'), dest: path.join('services', 'postgres', 'init', 'gitkeep') },
];

for (const { src, dest } of dotfilesToRename) {
  const srcPath = path.join(TEMPLATE_DIR, src);
  const destPath = path.join(TEMPLATE_DIR, dest);
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
  }
}

// Create lint-staged config (simplified version without create-nexu filter)
const lintStagedConfig = `module.exports = {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
`;
fs.writeFileSync(path.join(TEMPLATE_DIR, 'lintstagedrc.cjs'), lintStagedConfig);

// Update package.json with placeholder name
const packageJsonPath = path.join(TEMPLATE_DIR, 'package.json');
let packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
packageJsonContent = packageJsonContent.replace('"name": "nexu"', '"name": "{{PROJECT_NAME}}"');
fs.writeFileSync(packageJsonPath, packageJsonContent);

// Remove create-nexu from pnpm-workspace.yaml in template
const workspacePath = path.join(TEMPLATE_DIR, 'pnpm-workspace.yaml');
if (fs.existsSync(workspacePath)) {
  let workspaceContent = fs.readFileSync(workspacePath, 'utf-8');
  workspaceContent = workspaceContent.replace(/\s*- 'create-nexu'\n?/g, '\n');
  fs.writeFileSync(workspacePath, workspaceContent);
}

// Remove create-nexu from .eslintrc.js ignorePatterns in template
const eslintPath = path.join(TEMPLATE_DIR, '.eslintrc.js');
if (fs.existsSync(eslintPath)) {
  let eslintContent = fs.readFileSync(eslintPath, 'utf-8');
  eslintContent = eslintContent.replace(/\s*'create-nexu',?\n?/g, '\n');
  fs.writeFileSync(eslintPath, eslintContent);
}

// Remove scripts that are only for this repo
const scriptsToRemove = ['generate-template.sh', 'publish-cli.sh', 'generate-app.sh', 'generate-template.mjs', 'publish-cli.mjs'];
for (const script of scriptsToRemove) {
  const scriptPath = path.join(TEMPLATE_DIR, 'scripts', script);
  if (fs.existsSync(scriptPath)) {
    fs.unlinkSync(scriptPath);
  }
}

// Update template package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
delete pkg['lint-staged'];
delete pkg.scripts['generate:template'];
delete pkg.scripts['publish:cli'];
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`✅ Template generated at: ${TEMPLATE_DIR}`);
console.log('');
console.log('Files included:');
const files = fs.readdirSync(TEMPLATE_DIR);
files.forEach((file) => console.log(`  ${file}`));
