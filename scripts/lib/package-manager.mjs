/**
 * Package manager detection and utilities
 * Supports: npm, yarn, pnpm
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

/**
 * Detect which package manager is being used in a project
 * @param {string} projectDir - The project directory to check
 * @returns {'pnpm' | 'yarn' | 'npm'} The detected package manager
 */
export function detectPackageManager(projectDir = process.cwd()) {
  // Check for lock files
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) {
    return 'npm';
  }

  // Check packageManager field in package.json
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith('pnpm')) return 'pnpm';
        if (pkg.packageManager.startsWith('yarn')) return 'yarn';
        if (pkg.packageManager.startsWith('npm')) return 'npm';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check npm_config_user_agent environment variable (set by package managers)
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';

  // Default to npm
  return 'npm';
}

/**
 * Check if a package manager is installed
 * @param {string} pm - Package manager name
 * @returns {boolean}
 */
export function isPackageManagerInstalled(pm) {
  try {
    const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [pm], {
      stdio: 'pipe',
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Get the run command for a package manager
 * @param {'pnpm' | 'yarn' | 'npm'} pm
 * @returns {string}
 */
export function getRunCommand(pm) {
  switch (pm) {
    case 'pnpm':
      return 'pnpm';
    case 'yarn':
      return 'yarn';
    case 'npm':
    default:
      return 'npm run';
  }
}

/**
 * Get the execute command (for running binaries)
 * @param {'pnpm' | 'yarn' | 'npm'} pm
 * @returns {string}
 */
export function getExecCommand(pm) {
  switch (pm) {
    case 'pnpm':
      return 'pnpm exec';
    case 'yarn':
      return 'yarn';
    case 'npm':
    default:
      return 'npx';
  }
}

/**
 * Get the install command
 * @param {'pnpm' | 'yarn' | 'npm'} pm
 * @param {object} options
 * @param {boolean} options.frozen - Use frozen lockfile
 * @returns {string}
 */
export function getInstallCommand(pm, options = {}) {
  const { frozen = false } = options;

  switch (pm) {
    case 'pnpm':
      return frozen ? 'pnpm install --frozen-lockfile' : 'pnpm install';
    case 'yarn':
      return frozen ? 'yarn install --frozen-lockfile' : 'yarn install';
    case 'npm':
    default:
      return frozen ? 'npm ci' : 'npm install';
  }
}

/**
 * Get the add dependency command
 * @param {'pnpm' | 'yarn' | 'npm'} pm
 * @param {string} pkg - Package name
 * @param {object} options
 * @param {boolean} options.dev - Install as dev dependency
 * @returns {string}
 */
export function getAddCommand(pm, pkg, options = {}) {
  const { dev = false } = options;

  switch (pm) {
    case 'pnpm':
      return dev ? `pnpm add -D ${pkg}` : `pnpm add ${pkg}`;
    case 'yarn':
      return dev ? `yarn add -D ${pkg}` : `yarn add ${pkg}`;
    case 'npm':
    default:
      return dev ? `npm install -D ${pkg}` : `npm install ${pkg}`;
  }
}

/**
 * Get workspace filter command
 * @param {'pnpm' | 'yarn' | 'npm'} pm
 * @param {string} workspace - Workspace name
 * @returns {string}
 */
export function getWorkspaceFilter(pm, workspace) {
  switch (pm) {
    case 'pnpm':
      return `--filter=${workspace}`;
    case 'yarn':
      return `workspace ${workspace}`;
    case 'npm':
    default:
      return `-w ${workspace}`;
  }
}

/**
 * Run a command with the detected package manager
 * @param {string} script - Script to run
 * @param {object} options
 * @param {string} options.cwd - Working directory
 * @param {'pnpm' | 'yarn' | 'npm'} options.pm - Package manager (auto-detected if not provided)
 */
export function runScript(script, options = {}) {
  const { cwd = process.cwd(), pm = detectPackageManager(cwd) } = options;
  const runCmd = getRunCommand(pm);
  const cmd = `${runCmd} ${script}`;
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

export default {
  detectPackageManager,
  isPackageManagerInstalled,
  getRunCommand,
  getExecCommand,
  getInstallCommand,
  getAddCommand,
  getWorkspaceFilter,
  runScript,
};
