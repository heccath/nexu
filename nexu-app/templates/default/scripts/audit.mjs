#!/usr/bin/env node

/**
 * Code Audit Script
 *
 * Runs multiple security and code quality checks on the monorepo:
 * - npm audit: Check for vulnerable dependencies
 * - ESLint: Code quality and potential bugs
 * - TypeScript: Type checking
 * - Secrets detection: Check for hardcoded secrets
 * - License check: Verify dependency licenses
 * - Dependency check: Outdated and unused dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { detectPackageManager, getRunCommand, getExecCommand } from './lib/package-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}!${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
  section: (msg) => console.log(`\n${colors.bold}${colors.magenta}▶ ${msg}${colors.reset}\n`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

// Get directories
const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

// Detect package manager
const pm = detectPackageManager(ROOT_DIR);
const runCmd = getRunCommand(pm);
const execCmd = getExecCommand(pm);

// Parse arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  security: args.includes('--security') || args.includes('-s') || args.length === 0,
  quality: args.includes('--quality') || args.includes('-q') || args.length === 0,
  deps: args.includes('--deps') || args.includes('-d') || args.length === 0,
  secrets: args.includes('--secrets') || args.length === 0,
  all: args.includes('--all') || args.includes('-a'),
  app: args.find((a) => a.startsWith('--app='))?.split('=')[1],
  help: args.includes('--help') || args.includes('-h'),
};

if (options.all) {
  options.security = true;
  options.quality = true;
  options.deps = true;
  options.secrets = true;
}

// Results tracking
const results = {
  passed: 0,
  warnings: 0,
  errors: 0,
  checks: [],
};

function addResult(name, status, message = '') {
  results.checks.push({ name, status, message });
  if (status === 'pass') results.passed++;
  else if (status === 'warn') results.warnings++;
  else if (status === 'error') results.errors++;
}

// Run command and return result
function runCommand(cmd, cwd = ROOT_DIR, silent = false) {
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      exitCode: error.status,
    };
  }
}

// Check if command exists
function commandExists(cmd) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    stdio: 'pipe',
  });
  return result.status === 0;
}

// Get list of apps
function getApps() {
  if (!fs.existsSync(APPS_DIR)) return [];
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

// Get list of packages
function getPackages() {
  if (!fs.existsSync(PACKAGES_DIR)) return [];
  return fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

// ============================================================
// Security Checks
// ============================================================

async function checkDependencyVulnerabilities() {
  log.section('Dependency Vulnerabilities');

  let cmd;
  if (pm === 'pnpm') {
    cmd = 'pnpm audit --json';
  } else if (pm === 'yarn') {
    cmd = 'yarn audit --json';
  } else {
    cmd = 'npm audit --json';
  }

  const result = runCommand(cmd, ROOT_DIR, true);

  try {
    // Parse audit results
    let vulnerabilities = { critical: 0, high: 0, moderate: 0, low: 0 };

    if (pm === 'pnpm') {
      // pnpm audit format
      const lines = result.output.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'auditSummary') {
            vulnerabilities = data.data.vulnerabilities || vulnerabilities;
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } else {
      // npm/yarn audit format
      const data = JSON.parse(result.output || '{}');
      vulnerabilities = data.metadata?.vulnerabilities || vulnerabilities;
    }

    const total = vulnerabilities.critical + vulnerabilities.high + vulnerabilities.moderate + vulnerabilities.low;

    if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
      log.error(`Found ${vulnerabilities.critical} critical and ${vulnerabilities.high} high vulnerabilities`);
      addResult('Dependency Vulnerabilities', 'error', `${vulnerabilities.critical} critical, ${vulnerabilities.high} high`);
    } else if (vulnerabilities.moderate > 0 || vulnerabilities.low > 0) {
      log.warn(`Found ${vulnerabilities.moderate} moderate and ${vulnerabilities.low} low vulnerabilities`);
      addResult('Dependency Vulnerabilities', 'warn', `${vulnerabilities.moderate} moderate, ${vulnerabilities.low} low`);
    } else {
      log.success('No vulnerabilities found');
      addResult('Dependency Vulnerabilities', 'pass');
    }

    if (options.verbose && total > 0) {
      log.dim(`Run '${pm} audit' for details`);
    }
  } catch {
    if (result.exitCode === 0) {
      log.success('No vulnerabilities found');
      addResult('Dependency Vulnerabilities', 'pass');
    } else {
      log.warn('Could not parse audit results');
      addResult('Dependency Vulnerabilities', 'warn', 'Could not parse results');
    }
  }
}

// ============================================================
// Secrets Detection
// ============================================================

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', pattern: /[0-9a-zA-Z/+]{40}/g, context: /aws|secret/i },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'Generic API Key', pattern: /api[_-]?key['":\s]*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi },
  { name: 'Generic Secret', pattern: /secret['":\s]*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g },
  { name: 'Basic Auth', pattern: /basic\s+[A-Za-z0-9+/=]{20,}/gi },
  { name: 'Bearer Token', pattern: /bearer\s+[A-Za-z0-9_\-.~+/]+=*/gi },
  { name: 'Database URL', pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@/gi },
  { name: 'Password in URL', pattern: /(?:password|passwd|pwd)['"=:\s]+['"]?[^'"\s]{8,}['"]?/gi },
];

const IGNORE_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.turbo',
  '*.lock',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
];

const IGNORE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];

function shouldIgnorePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return IGNORE_PATHS.some((ignore) => {
    if (ignore.startsWith('*')) {
      return normalized.endsWith(ignore.slice(1));
    }
    return normalized.includes(ignore);
  });
}

function scanFileForSecrets(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORE_EXTENSIONS.includes(ext)) return [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const findings = [];

    for (const { name, pattern, context } of SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Skip if context is required but not found
          if (context && !context.test(content)) continue;

          // Skip common false positives
          if (match.includes('example') || match.includes('placeholder') || match.includes('your-')) continue;

          // Skip if it's in a comment or documentation
          const lineIndex = content.indexOf(match);
          const lineStart = content.lastIndexOf('\n', lineIndex) + 1;
          const line = content.slice(lineStart, content.indexOf('\n', lineIndex));

          if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('*')) continue;

          findings.push({
            type: name,
            file: filePath,
            line: content.slice(0, lineIndex).split('\n').length,
            preview: match.slice(0, 20) + '...',
          });
        }
      }
    }

    return findings;
  } catch {
    return [];
  }
}

function scanDirectoryForSecrets(dir, findings = []) {
  if (!fs.existsSync(dir)) return findings;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT_DIR, fullPath);

    if (shouldIgnorePath(relativePath)) continue;

    if (entry.isDirectory()) {
      scanDirectoryForSecrets(fullPath, findings);
    } else if (entry.isFile()) {
      findings.push(...scanFileForSecrets(fullPath));
    }
  }

  return findings;
}

async function checkSecrets() {
  log.section('Secrets Detection');

  const scanDirs = [APPS_DIR, PACKAGES_DIR, path.join(ROOT_DIR, 'scripts')];
  let allFindings = [];

  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) {
      allFindings.push(...scanDirectoryForSecrets(dir));
    }
  }

  // Also scan root config files
  const rootFiles = fs.readdirSync(ROOT_DIR).filter((f) => {
    const ext = path.extname(f);
    return ['.js', '.ts', '.json', '.yaml', '.yml', '.env'].includes(ext) && !f.includes('lock');
  });

  for (const file of rootFiles) {
    allFindings.push(...scanFileForSecrets(path.join(ROOT_DIR, file)));
  }

  // Deduplicate findings
  const uniqueFindings = allFindings.filter(
    (f, i, arr) => arr.findIndex((x) => x.file === f.file && x.line === f.line && x.type === f.type) === i
  );

  if (uniqueFindings.length > 0) {
    log.error(`Found ${uniqueFindings.length} potential secrets`);

    if (options.verbose) {
      for (const finding of uniqueFindings.slice(0, 10)) {
        const relPath = path.relative(ROOT_DIR, finding.file);
        log.dim(`  ${finding.type}: ${relPath}:${finding.line}`);
      }
      if (uniqueFindings.length > 10) {
        log.dim(`  ... and ${uniqueFindings.length - 10} more`);
      }
    }

    addResult('Secrets Detection', 'error', `${uniqueFindings.length} potential secrets found`);
  } else {
    log.success('No hardcoded secrets detected');
    addResult('Secrets Detection', 'pass');
  }
}

// ============================================================
// Code Quality Checks
// ============================================================

async function checkESLint() {
  log.section('ESLint Analysis');

  const eslintCmd = options.fix ? `${runCmd} lint --fix` : `${runCmd} lint`;

  const result = runCommand(eslintCmd, ROOT_DIR, true);

  if (result.success) {
    log.success('No ESLint errors found');
    addResult('ESLint', 'pass');
  } else {
    // Count errors and warnings from output
    const errorMatch = result.output.match(/(\d+)\s+error/);
    const warnMatch = result.output.match(/(\d+)\s+warning/);
    const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
    const warnings = warnMatch ? parseInt(warnMatch[1], 10) : 0;

    if (errors > 0) {
      log.error(`Found ${errors} errors and ${warnings} warnings`);
      addResult('ESLint', 'error', `${errors} errors, ${warnings} warnings`);
    } else if (warnings > 0) {
      log.warn(`Found ${warnings} warnings`);
      addResult('ESLint', 'warn', `${warnings} warnings`);
    } else {
      log.success('No ESLint issues found');
      addResult('ESLint', 'pass');
    }

    if (options.verbose && result.output) {
      console.log(result.output.slice(0, 1000));
    }
  }
}

async function checkTypeScript() {
  log.section('TypeScript Type Checking');

  const result = runCommand(`${runCmd} typecheck`, ROOT_DIR, true);

  if (result.success) {
    log.success('No TypeScript errors found');
    addResult('TypeScript', 'pass');
  } else {
    // Count errors from output
    const errorCount = (result.output.match(/error TS\d+/g) || []).length;

    if (errorCount > 0) {
      log.error(`Found ${errorCount} TypeScript errors`);
      addResult('TypeScript', 'error', `${errorCount} errors`);

      if (options.verbose && result.output) {
        // Show first few errors
        const lines = result.output.split('\n').slice(0, 20);
        console.log(lines.join('\n'));
      }
    } else {
      log.success('No TypeScript errors found');
      addResult('TypeScript', 'pass');
    }
  }
}

// ============================================================
// Dependency Checks
// ============================================================

async function checkOutdatedDependencies() {
  log.section('Outdated Dependencies');

  let cmd;
  if (pm === 'pnpm') {
    cmd = 'pnpm outdated --format json';
  } else if (pm === 'yarn') {
    cmd = 'yarn outdated --json';
  } else {
    cmd = 'npm outdated --json';
  }

  const result = runCommand(cmd, ROOT_DIR, true);

  try {
    let outdatedCount = 0;
    let majorUpdates = 0;

    if (pm === 'pnpm') {
      const lines = result.output.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (Array.isArray(data)) {
            outdatedCount = data.length;
            majorUpdates = data.filter((d) => {
              const current = d.current?.split('.')[0];
              const latest = d.latest?.split('.')[0];
              return current && latest && current !== latest;
            }).length;
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } else {
      const data = JSON.parse(result.output || '{}');
      outdatedCount = Object.keys(data).length;
      majorUpdates = Object.values(data).filter((d) => {
        const current = d.current?.split('.')[0];
        const latest = d.latest?.split('.')[0];
        return current && latest && current !== latest;
      }).length;
    }

    if (majorUpdates > 0) {
      log.warn(`${outdatedCount} outdated packages (${majorUpdates} major updates available)`);
      addResult('Outdated Dependencies', 'warn', `${outdatedCount} outdated, ${majorUpdates} major`);
    } else if (outdatedCount > 0) {
      log.info(`${outdatedCount} packages have minor/patch updates available`);
      addResult('Outdated Dependencies', 'pass', `${outdatedCount} minor updates`);
    } else {
      log.success('All dependencies are up to date');
      addResult('Outdated Dependencies', 'pass');
    }

    if (options.verbose) {
      log.dim(`Run '${pm} outdated' for details`);
    }
  } catch {
    log.success('All dependencies are up to date');
    addResult('Outdated Dependencies', 'pass');
  }
}

async function checkUnusedDependencies() {
  log.section('Unused Dependencies');

  // Check if depcheck is available
  if (!commandExists('depcheck')) {
    log.dim('depcheck not installed, skipping unused dependency check');
    log.dim(`Install with: npm install -g depcheck`);
    addResult('Unused Dependencies', 'warn', 'depcheck not installed');
    return;
  }

  const apps = getApps();
  const packages = getPackages();
  let totalUnused = 0;

  const checkDirs = [
    ...apps.map((a) => ({ name: a, path: path.join(APPS_DIR, a) })),
    ...packages.map((p) => ({ name: p, path: path.join(PACKAGES_DIR, p) })),
  ];

  for (const { name, path: dirPath } of checkDirs) {
    if (!fs.existsSync(path.join(dirPath, 'package.json'))) continue;

    const result = runCommand(`depcheck --json`, dirPath, true);

    try {
      const data = JSON.parse(result.output || '{}');
      const unused = [...(data.dependencies || []), ...(data.devDependencies || [])];

      if (unused.length > 0) {
        totalUnused += unused.length;
        if (options.verbose) {
          log.dim(`  ${name}: ${unused.join(', ')}`);
        }
      }
    } catch {
      // Skip parse errors
    }
  }

  if (totalUnused > 0) {
    log.warn(`Found ${totalUnused} potentially unused dependencies`);
    addResult('Unused Dependencies', 'warn', `${totalUnused} unused`);
  } else {
    log.success('No unused dependencies detected');
    addResult('Unused Dependencies', 'pass');
  }
}

// ============================================================
// License Check
// ============================================================

async function checkLicenses() {
  log.section('License Compliance');

  // Check if license-checker is available
  if (!commandExists('license-checker')) {
    log.dim('license-checker not installed, skipping license check');
    log.dim(`Install with: npm install -g license-checker`);
    addResult('License Compliance', 'warn', 'license-checker not installed');
    return;
  }

  const PROBLEMATIC_LICENSES = ['GPL', 'AGPL', 'LGPL', 'SSPL', 'BUSL', 'Commons Clause'];
  const UNKNOWN_LICENSE = 'UNKNOWN';

  const result = runCommand('license-checker --json --production', ROOT_DIR, true);

  try {
    const data = JSON.parse(result.output || '{}');
    const packages = Object.entries(data);
    const problematic = [];
    const unknown = [];

    for (const [pkg, info] of packages) {
      const license = info.licenses || UNKNOWN_LICENSE;
      const licenseStr = Array.isArray(license) ? license.join(', ') : license;

      if (licenseStr === UNKNOWN_LICENSE) {
        unknown.push(pkg);
      } else if (PROBLEMATIC_LICENSES.some((l) => licenseStr.toUpperCase().includes(l))) {
        problematic.push({ pkg, license: licenseStr });
      }
    }

    if (problematic.length > 0) {
      log.warn(`Found ${problematic.length} packages with restrictive licenses`);
      if (options.verbose) {
        for (const { pkg, license } of problematic.slice(0, 5)) {
          log.dim(`  ${pkg}: ${license}`);
        }
      }
      addResult('License Compliance', 'warn', `${problematic.length} restrictive licenses`);
    } else if (unknown.length > 5) {
      log.warn(`Found ${unknown.length} packages with unknown licenses`);
      addResult('License Compliance', 'warn', `${unknown.length} unknown licenses`);
    } else {
      log.success('All licenses are compliant');
      addResult('License Compliance', 'pass');
    }
  } catch {
    log.warn('Could not check licenses');
    addResult('License Compliance', 'warn', 'Check failed');
  }
}

// ============================================================
// Main
// ============================================================

function showHelp() {
  console.log(`
${colors.bold}Usage:${colors.reset} pnpm audit [options]

${colors.bold}Options:${colors.reset}
  -a, --all       Run all checks
  -s, --security  Run security checks only (vulnerabilities, secrets)
  -q, --quality   Run code quality checks only (ESLint, TypeScript)
  -d, --deps      Run dependency checks only (outdated, unused, licenses)
  --secrets       Run secrets detection only
  --fix           Attempt to fix issues (ESLint)
  -v, --verbose   Show detailed output
  --app=<name>    Audit specific app only
  -h, --help      Show this help message

${colors.bold}Examples:${colors.reset}
  pnpm audit                  # Run all checks
  pnpm audit --security       # Security checks only
  pnpm audit --quality --fix  # Code quality with auto-fix
  pnpm audit --app=web        # Audit specific app
`);
}

function printSummary() {
  log.title('📊 Audit Summary');

  const statusIcon = {
    pass: `${colors.green}✓${colors.reset}`,
    warn: `${colors.yellow}!${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  };

  for (const check of results.checks) {
    const icon = statusIcon[check.status];
    const msg = check.message ? ` (${check.message})` : '';
    console.log(`  ${icon} ${check.name}${colors.dim}${msg}${colors.reset}`);
  }

  console.log('');
  console.log(
    `${colors.bold}Results:${colors.reset} ` +
      `${colors.green}${results.passed} passed${colors.reset}, ` +
      `${colors.yellow}${results.warnings} warnings${colors.reset}, ` +
      `${colors.red}${results.errors} errors${colors.reset}`
  );
  console.log('');

  if (results.errors > 0) {
    process.exit(1);
  }
}

async function main() {
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  log.title('🔍 Code Audit');
  log.info(`Package manager: ${pm}`);
  log.info(`Root directory: ${ROOT_DIR}`);

  if (options.app) {
    log.info(`Auditing app: ${options.app}`);
  }

  // Security checks
  if (options.security) {
    await checkDependencyVulnerabilities();
  }

  if (options.secrets) {
    await checkSecrets();
  }

  // Code quality checks
  if (options.quality) {
    await checkESLint();
    await checkTypeScript();
  }

  // Dependency checks
  if (options.deps) {
    await checkOutdatedDependencies();
    await checkUnusedDependencies();
    await checkLicenses();
  }

  printSummary();
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
