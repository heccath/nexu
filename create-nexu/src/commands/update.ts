import path from 'path';
import { fileURLToPath } from 'url';

import chalk from 'chalk';
import { diffLines } from 'diff';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

import { SHARED_PACKAGES, TEMPLATE_DIRS } from '../utils/constants.js';
import {
  isNexuProject,
  log,
  detectPackageManager,
  getInstallCommand,
  execInherit,
} from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UpdateOptions {
  packages?: boolean;
  config?: boolean;
  workflows?: boolean;
  services?: boolean;
  scripts?: boolean;
  dependencies?: boolean;
  all?: boolean;
  dryRun?: boolean;
  preview?: boolean;
}

interface FileChange {
  type: 'add' | 'modify' | 'delete';
  relativePath: string;
  srcPath: string;
  destPath: string;
  category: string;
}

interface ContentChange {
  type: 'package.json';
  changes: {
    added: Record<string, Record<string, string>>;
    updated: Record<string, Record<string, { from: string; to: string }>>;
  };
}

function getTemplateDir(): string {
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', 'templates', 'default'),
    path.resolve(__dirname, '..', 'templates', 'default'),
  ];

  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
  }

  throw new Error('Template directory not found. Please reinstall the package.');
}

function compareFiles(srcPath: string, destPath: string): boolean {
  if (!fs.existsSync(destPath)) return false;
  if (!fs.existsSync(srcPath)) return false;

  const srcStat = fs.statSync(srcPath);
  const destStat = fs.statSync(destPath);

  if (srcStat.isDirectory() || destStat.isDirectory()) return false;

  const srcContent = fs.readFileSync(srcPath, 'utf-8');
  const destContent = fs.readFileSync(destPath, 'utf-8');

  return srcContent === destContent;
}

function collectFileChanges(
  srcDir: string,
  destDir: string,
  category: string,
  basePath: string = '',
  checkDeleted: boolean = true
): FileChange[] {
  const changes: FileChange[] = [];

  // Collect additions and modifications from template
  if (fs.existsSync(srcDir)) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        changes.push(
          ...collectFileChanges(srcPath, destPath, category, relativePath, checkDeleted)
        );
      } else {
        if (!fs.existsSync(destPath)) {
          changes.push({ type: 'add', relativePath, srcPath, destPath, category });
        } else if (!compareFiles(srcPath, destPath)) {
          changes.push({ type: 'modify', relativePath, srcPath, destPath, category });
        }
      }
    }
  }

  // Collect deletions (files in project but not in template)
  if (checkDeleted && fs.existsSync(destDir)) {
    const destEntries = fs.readdirSync(destDir, { withFileTypes: true });

    for (const entry of destEntries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      // Skip excluded directories/files
      if (shouldExcludeFromDeletion(entry.name, relativePath)) {
        continue;
      }

      // Skip if it exists in template
      if (fs.existsSync(srcPath)) continue;

      if (entry.isDirectory()) {
        // Recursively collect deleted files in subdirectories
        changes.push(...collectDeletedFiles(destPath, category, relativePath));
      } else {
        changes.push({ type: 'delete', relativePath, srcPath, destPath, category });
      }
    }
  }

  return changes;
}

// Directories/files to exclude from deletion detection
const EXCLUDE_FROM_DELETION = [
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  'build',
  '.next',
  'coverage',
  '.husky/_', // Husky internal files
  '.DS_Store',
];

function shouldExcludeFromDeletion(name: string, relativePath: string): boolean {
  // Check if name matches any exclusion
  if (EXCLUDE_FROM_DELETION.includes(name)) {
    return true;
  }
  // Check if path starts with any exclusion pattern
  for (const pattern of EXCLUDE_FROM_DELETION) {
    if (relativePath.startsWith(pattern + '/') || relativePath.startsWith(pattern + path.sep)) {
      return true;
    }
    if (relativePath === pattern) {
      return true;
    }
  }
  return false;
}

function collectDeletedFiles(destDir: string, category: string, basePath: string): FileChange[] {
  const changes: FileChange[] = [];

  if (!fs.existsSync(destDir)) return changes;

  const entries = fs.readdirSync(destDir, { withFileTypes: true });

  for (const entry of entries) {
    const destPath = path.join(destDir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    // Skip excluded directories/files
    if (shouldExcludeFromDeletion(entry.name, relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      changes.push(...collectDeletedFiles(destPath, category, relativePath));
    } else {
      changes.push({ type: 'delete', relativePath, srcPath: '', destPath, category });
    }
  }

  return changes;
}

function showFileDiff(srcPath: string, destPath: string): void {
  if (!fs.existsSync(destPath)) {
    console.log(chalk.green('  (new file)'));
    return;
  }

  const srcContent = fs.readFileSync(srcPath, 'utf-8');
  const destContent = fs.readFileSync(destPath, 'utf-8');

  const differences = diffLines(destContent, srcContent);
  let hasChanges = false;

  for (const part of differences) {
    if (part.added || part.removed) {
      hasChanges = true;
      const lines = part.value.split('\n').filter(l => l.length > 0);
      for (const line of lines.slice(0, 5)) {
        // Limit to 5 lines per change
        if (part.added) {
          console.log(chalk.green(`  + ${line.substring(0, 80)}`));
        } else {
          console.log(chalk.red(`  - ${line.substring(0, 80)}`));
        }
      }
      if (lines.length > 5) {
        console.log(chalk.gray(`  ... and ${lines.length - 5} more lines`));
      }
    }
  }

  if (!hasChanges) {
    console.log(chalk.gray('  (no visible changes)'));
  }
}

function collectDependencyChanges(
  templatePkgPath: string,
  projectPkgPath: string
): ContentChange | null {
  if (!fs.existsSync(templatePkgPath) || !fs.existsSync(projectPkgPath)) {
    return null;
  }

  const templatePkg = fs.readJsonSync(templatePkgPath);
  const projectPkg = fs.readJsonSync(projectPkgPath);

  const changes: ContentChange = {
    type: 'package.json',
    changes: {
      added: { dependencies: {}, devDependencies: {}, scripts: {} },
      updated: { dependencies: {}, devDependencies: {}, scripts: {} },
    },
  };

  // Check dependencies
  for (const depType of ['dependencies', 'devDependencies'] as const) {
    if (templatePkg[depType]) {
      for (const [pkg, version] of Object.entries(templatePkg[depType] as Record<string, string>)) {
        if (!projectPkg[depType]?.[pkg]) {
          changes.changes.added[depType][pkg] = version;
        } else if (projectPkg[depType][pkg] !== version) {
          changes.changes.updated[depType][pkg] = {
            from: projectPkg[depType][pkg],
            to: version,
          };
        }
      }
    }
  }

  // Check scripts
  if (templatePkg.scripts) {
    for (const [script, cmd] of Object.entries(templatePkg.scripts as Record<string, string>)) {
      if (!projectPkg.scripts?.[script]) {
        changes.changes.added.scripts[script] = cmd;
      } else if (projectPkg.scripts[script] !== cmd) {
        changes.changes.updated.scripts[script] = {
          from: projectPkg.scripts[script],
          to: cmd,
        };
      }
    }
  }

  return changes;
}

function displayDependencyChanges(changes: ContentChange): void {
  const { added, updated } = changes.changes;

  // Show added dependencies
  if (Object.keys(added.dependencies).length > 0) {
    console.log(chalk.cyan('\n  New dependencies:'));
    for (const [pkg, version] of Object.entries(added.dependencies)) {
      console.log(chalk.green(`    + ${pkg}: ${version}`));
    }
  }

  if (Object.keys(added.devDependencies).length > 0) {
    console.log(chalk.cyan('\n  New devDependencies:'));
    for (const [pkg, version] of Object.entries(added.devDependencies)) {
      console.log(chalk.green(`    + ${pkg}: ${version}`));
    }
  }

  // Show updated dependencies
  if (Object.keys(updated.dependencies).length > 0) {
    console.log(chalk.cyan('\n  Updated dependencies:'));
    for (const [pkg, { from, to }] of Object.entries(updated.dependencies)) {
      console.log(chalk.yellow(`    ~ ${pkg}: ${from} → ${to}`));
    }
  }

  if (Object.keys(updated.devDependencies).length > 0) {
    console.log(chalk.cyan('\n  Updated devDependencies:'));
    for (const [pkg, { from, to }] of Object.entries(updated.devDependencies)) {
      console.log(chalk.yellow(`    ~ ${pkg}: ${from} → ${to}`));
    }
  }

  // Show new scripts
  if (Object.keys(added.scripts).length > 0) {
    console.log(chalk.cyan('\n  New scripts:'));
    for (const [script, cmd] of Object.entries(added.scripts)) {
      console.log(chalk.green(`    + ${script}: ${String(cmd).substring(0, 50)}...`));
    }
  }

  // Show updated scripts
  if (Object.keys(updated.scripts).length > 0) {
    console.log(chalk.cyan('\n  Updated scripts:'));
    for (const [script, { from, to }] of Object.entries(updated.scripts)) {
      console.log(chalk.yellow(`    ~ ${script}:`));
      console.log(chalk.red(`      - ${from.substring(0, 60)}${from.length > 60 ? '...' : ''}`));
      console.log(chalk.green(`      + ${to.substring(0, 60)}${to.length > 60 ? '...' : ''}`));
    }
  }
}

function hasChanges(changes: ContentChange): boolean {
  const { added, updated } = changes.changes;
  return (
    Object.keys(added.dependencies).length > 0 ||
    Object.keys(added.devDependencies).length > 0 ||
    Object.keys(added.scripts).length > 0 ||
    Object.keys(updated.dependencies).length > 0 ||
    Object.keys(updated.devDependencies).length > 0 ||
    Object.keys(updated.scripts).length > 0
  );
}

export async function update(options: UpdateOptions): Promise<void> {
  console.log(chalk.bold('\n🔄 Update Nexu Project\n'));

  const projectDir = process.cwd();

  // Verify this is a Nexu project
  if (!isNexuProject(projectDir)) {
    log(
      'This does not appear to be a Nexu project. Run this command from the project root.',
      'error'
    );
    process.exit(1);
  }

  const templateDir = getTemplateDir();

  // Determine what to update
  const updateAll =
    options.all ||
    (!options.packages &&
      !options.config &&
      !options.workflows &&
      !options.services &&
      !options.scripts &&
      !options.dependencies);

  const updateTargets = {
    packages: updateAll || options.packages,
    config: updateAll || options.config,
    workflows: updateAll || options.workflows,
    services: updateAll || options.services,
    scripts: updateAll || options.scripts,
    dependencies: updateAll || options.dependencies,
  };

  // Collect all changes
  const spinner = ora('Analyzing changes...').start();
  const allFileChanges: FileChange[] = [];
  let dependencyChanges: ContentChange | null = null;

  // Collect file changes for each category
  if (updateTargets.config) {
    for (const file of TEMPLATE_DIRS.config) {
      const srcFile = path.join(templateDir, file);
      const destFile = path.join(projectDir, file);
      if (fs.existsSync(srcFile)) {
        if (!fs.existsSync(destFile)) {
          allFileChanges.push({
            type: 'add',
            relativePath: file,
            srcPath: srcFile,
            destPath: destFile,
            category: 'config',
          });
        } else if (!compareFiles(srcFile, destFile)) {
          allFileChanges.push({
            type: 'modify',
            relativePath: file,
            srcPath: srcFile,
            destPath: destFile,
            category: 'config',
          });
        }
      }
    }

    // Check .husky and .vscode
    allFileChanges.push(
      ...collectFileChanges(
        path.join(templateDir, '.husky'),
        path.join(projectDir, '.husky'),
        'config',
        '.husky'
      )
    );
    allFileChanges.push(
      ...collectFileChanges(
        path.join(templateDir, '.vscode'),
        path.join(projectDir, '.vscode'),
        'config',
        '.vscode'
      )
    );
  }

  if (updateTargets.workflows) {
    allFileChanges.push(
      ...collectFileChanges(
        path.join(templateDir, '.github'),
        path.join(projectDir, '.github'),
        'workflows',
        '.github'
      )
    );
  }

  if (updateTargets.services) {
    allFileChanges.push(
      ...collectFileChanges(
        path.join(templateDir, 'services'),
        path.join(projectDir, 'services'),
        'services',
        'services'
      )
    );
    allFileChanges.push(
      ...collectFileChanges(
        path.join(templateDir, 'docker'),
        path.join(projectDir, 'docker'),
        'services',
        'docker'
      )
    );
  }

  if (updateTargets.scripts) {
    allFileChanges.push(
      ...collectFileChanges(
        path.join(templateDir, 'scripts'),
        path.join(projectDir, 'scripts'),
        'scripts',
        'scripts'
      )
    );
  }

  if (updateTargets.packages) {
    // Get existing packages to check
    const existingPackages = fs.existsSync(path.join(projectDir, 'packages'))
      ? fs
          .readdirSync(path.join(projectDir, 'packages'))
          .filter(f => fs.statSync(path.join(projectDir, 'packages', f)).isDirectory())
      : [];

    for (const pkg of SHARED_PACKAGES) {
      if (existingPackages.includes(pkg)) {
        allFileChanges.push(
          ...collectFileChanges(
            path.join(templateDir, 'packages', pkg),
            path.join(projectDir, 'packages', pkg),
            'packages',
            path.join('packages', pkg)
          )
        );
      }
    }
  }

  if (updateTargets.dependencies) {
    dependencyChanges = collectDependencyChanges(
      path.join(templateDir, 'package.json'),
      path.join(projectDir, 'package.json')
    );
  }

  spinner.stop();

  // Display summary of changes
  const addedFiles = allFileChanges.filter(c => c.type === 'add');
  const modifiedFiles = allFileChanges.filter(c => c.type === 'modify');
  const deletedFiles = allFileChanges.filter(c => c.type === 'delete');

  if (
    addedFiles.length === 0 &&
    modifiedFiles.length === 0 &&
    deletedFiles.length === 0 &&
    (!dependencyChanges || !hasChanges(dependencyChanges))
  ) {
    console.log(chalk.green('✓ Your project is up to date! No changes needed.\n'));
    return;
  }

  console.log(chalk.bold('📋 Changes to apply:\n'));

  // Show file changes by category
  const categories = [...new Set(allFileChanges.map(c => c.category))];

  for (const category of categories) {
    const categoryChanges = allFileChanges.filter(c => c.category === category);
    if (categoryChanges.length === 0) continue;

    const categoryNames: Record<string, string> = {
      config: 'Configuration files',
      workflows: 'GitHub workflows',
      services: 'Docker services',
      scripts: 'Scripts',
      packages: 'Shared packages',
    };

    console.log(chalk.cyan.bold(`\n${categoryNames[category] || category}:`));

    const added = categoryChanges.filter(c => c.type === 'add');
    const modified = categoryChanges.filter(c => c.type === 'modify');
    const deleted = categoryChanges.filter(c => c.type === 'delete');

    if (added.length > 0) {
      console.log(chalk.green(`  New files (${added.length}):`));
      for (const change of added.slice(0, 10)) {
        console.log(chalk.green(`    + ${change.relativePath}`));
      }
      if (added.length > 10) {
        console.log(chalk.gray(`    ... and ${added.length - 10} more files`));
      }
    }

    if (modified.length > 0) {
      console.log(chalk.yellow(`  Modified files (${modified.length}):`));
      for (const change of modified.slice(0, 10)) {
        console.log(chalk.yellow(`    ~ ${change.relativePath}`));
      }
      if (modified.length > 10) {
        console.log(chalk.gray(`    ... and ${modified.length - 10} more files`));
      }
    }

    if (deleted.length > 0) {
      console.log(chalk.red(`  Deleted files (${deleted.length}):`));
      for (const change of deleted.slice(0, 10)) {
        console.log(chalk.red(`    - ${change.relativePath}`));
      }
      if (deleted.length > 10) {
        console.log(chalk.gray(`    ... and ${deleted.length - 10} more files`));
      }
    }
  }

  // Show dependency changes
  if (dependencyChanges && hasChanges(dependencyChanges)) {
    console.log(chalk.cyan.bold('\nPackage.json changes:'));
    displayDependencyChanges(dependencyChanges);
  }

  console.log('');

  // Show detailed diff if --preview flag is set
  if (options.preview) {
    const { showDiff } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'showDiff',
        message: 'Show detailed file differences?',
        default: false,
      },
    ]);

    if (showDiff) {
      for (const change of modifiedFiles) {
        console.log(chalk.bold(`\n${change.relativePath}:`));
        showFileDiff(change.srcPath, change.destPath);
      }
    }
  }

  if (options.dryRun) {
    console.log(chalk.blue('\ni Dry run mode - no changes were made.\n'));
    return;
  }

  // Select which changes to apply
  const { selectedCategories } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedCategories',
      message: 'Select which changes to apply:',
      choices: [
        ...categories.map(cat => {
          const count = allFileChanges.filter(c => c.category === cat).length;
          const categoryNames: Record<string, string> = {
            config: 'Configuration files',
            workflows: 'GitHub workflows',
            services: 'Docker services',
            scripts: 'Scripts',
            packages: 'Shared packages',
          };
          return {
            name: `${categoryNames[cat] || cat} (${count} files)`,
            value: cat,
            checked: true,
          };
        }),
        ...(dependencyChanges && hasChanges(dependencyChanges)
          ? [
              {
                name: 'Package.json dependencies',
                value: 'dependencies',
                checked: true,
              },
            ]
          : []),
      ],
    },
  ]);

  if (selectedCategories.length === 0) {
    log('No changes selected. Update cancelled.', 'warn');
    return;
  }

  // Final confirmation
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Apply ${selectedCategories.length} category(ies) of changes?`,
      default: true,
    },
  ]);

  if (!confirm) {
    log('Update cancelled.', 'warn');
    return;
  }

  // Apply changes
  const applySpinner = ora('Applying changes...').start();

  let appliedFiles = 0;
  let deletedFilesCount = 0;

  for (const change of allFileChanges) {
    if (!selectedCategories.includes(change.category)) continue;

    if (change.type === 'delete') {
      // Delete the file
      if (fs.existsSync(change.destPath)) {
        fs.removeSync(change.destPath);
        deletedFilesCount++;
      }
    } else {
      // Add or modify the file
      fs.ensureDirSync(path.dirname(change.destPath));
      fs.copySync(change.srcPath, change.destPath, { overwrite: true });
      appliedFiles++;
    }
  }

  // Clean up empty directories after deletions
  if (deletedFilesCount > 0) {
    cleanEmptyDirectories(projectDir);
  }

  // Apply dependency changes
  if (selectedCategories.includes('dependencies') && dependencyChanges) {
    const templatePkgPath = path.join(templateDir, 'package.json');
    const projectPkgPath = path.join(projectDir, 'package.json');

    const templatePkg = fs.readJsonSync(templatePkgPath);
    const projectPkg = fs.readJsonSync(projectPkgPath);

    // Merge devDependencies
    if (templatePkg.devDependencies) {
      projectPkg.devDependencies = {
        ...projectPkg.devDependencies,
        ...templatePkg.devDependencies,
      };
    }

    // Merge dependencies
    if (templatePkg.dependencies) {
      projectPkg.dependencies = {
        ...projectPkg.dependencies,
        ...templatePkg.dependencies,
      };
    }

    // Merge scripts (update all scripts from template)
    if (templatePkg.scripts) {
      projectPkg.scripts = {
        ...projectPkg.scripts,
        ...templatePkg.scripts,
      };
    }

    // Sort dependencies alphabetically
    if (projectPkg.dependencies) {
      projectPkg.dependencies = sortObject(projectPkg.dependencies);
    }
    if (projectPkg.devDependencies) {
      projectPkg.devDependencies = sortObject(projectPkg.devDependencies);
    }

    fs.writeJsonSync(projectPkgPath, projectPkg, { spaces: 2 });
  }

  const summary = [];
  if (appliedFiles > 0) summary.push(`${appliedFiles} files updated`);
  if (deletedFilesCount > 0) summary.push(`${deletedFilesCount} files deleted`);

  applySpinner.succeed(summary.join(', ') || 'No file changes applied');

  // Run install if dependencies were updated
  if (
    selectedCategories.includes('dependencies') &&
    dependencyChanges &&
    hasChanges(dependencyChanges)
  ) {
    const pm = detectPackageManager(projectDir);
    const installCmd = getInstallCommand(pm);

    console.log(chalk.blue(`\n📦 Installing dependencies with ${pm}...\n`));

    try {
      execInherit(installCmd, projectDir);
      console.log(chalk.green('\n✓ Dependencies installed'));
    } catch {
      console.log(
        chalk.yellow(`\n! Failed to install dependencies. Run "${installCmd}" manually.`)
      );
    }
  }

  console.log('\n' + chalk.green.bold('✨ Update complete!\n'));
}

function cleanEmptyDirectories(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      cleanEmptyDirectories(fullPath);

      // Check if directory is now empty
      const remaining = fs.readdirSync(fullPath);
      if (remaining.length === 0) {
        fs.rmdirSync(fullPath);
      }
    }
  }
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  return Object.keys(obj)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = obj[key];
        return acc;
      },
      {} as Record<string, string>
    );
}
