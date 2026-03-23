#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(process.cwd());
const PORTS_FILE = path.join(ROOT_DIR, 'apps', 'ports.json');

function loadPorts() {
  if (!fs.existsSync(PORTS_FILE)) {
    return {};
  }
  try {
    const config = JSON.parse(fs.readFileSync(PORTS_FILE, 'utf-8'));
    return config.apps || {};
  } catch {
    return {};
  }
}

function getAppName() {
  const cwd = process.cwd();
  const appsDir = path.join(ROOT_DIR, 'apps');

  if (cwd === appsDir) {
    return null;
  }

  if (cwd.startsWith(appsDir + path.sep)) {
    const relative = path.relative(appsDir, cwd);
    return relative.split(path.sep)[0];
  }

  return null;
}

function main() {
  const appName = getAppName();

  if (!appName) {
    const args = process.argv.slice(2);
    execSync(args.join(' '), { stdio: 'inherit' });
    return;
  }

  const ports = loadPorts();
  const port = ports[appName];

  if (port) {
    process.env.PORT = port.toString();
    console.log(`[ports] Setting PORT=${port} for app: ${appName}`);
  }

  const args = process.argv.slice(2);
  execSync(args.join(' '), { stdio: 'inherit' });
}

main();
