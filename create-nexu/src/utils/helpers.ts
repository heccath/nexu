import { execSync } from 'child_process';
import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';

export function isNexuProject(dir: string): boolean {
  const packageJsonPath = path.join(dir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return false;

  try {
    const packageJson = fs.readJsonSync(packageJsonPath);
    return packageJson.name === 'nexu' || fs.existsSync(path.join(dir, 'turbo.json'));
  } catch {
    return false;
  }
}

export function exec(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`Command failed: ${command}`);
  }
}

export function execSilent(command: string, cwd?: string): boolean {
  try {
    execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

export function copyWithMerge(src: string, dest: string, overwrite = false): void {
  if (fs.existsSync(dest) && !overwrite) {
    // Merge directories
    if (fs.statSync(src).isDirectory() && fs.statSync(dest).isDirectory()) {
      const files = fs.readdirSync(src);
      for (const file of files) {
        copyWithMerge(path.join(src, file), path.join(dest, file), overwrite);
      }
    }
    // Skip existing files
    return;
  }

  fs.copySync(src, dest, { overwrite });
}

export function updatePackageJson(projectDir: string, updates: Record<string, unknown>): void {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = fs.readJsonSync(packageJsonPath);

  const merged = deepMerge(packageJson, updates);
  fs.writeJsonSync(packageJsonPath, merged, { spaces: 2 });
}

export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
  };
  const icons = {
    info: 'i',
    success: '✓',
    warn: '!',
    error: '✗',
  };

  console.log(`${colors[type](icons[type])} ${message}`);
}
