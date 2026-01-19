import os from 'os';
import path from 'path';

import chalk from 'chalk';
import degit from 'degit';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

import { REPO_URL, REPO_BRANCH, SHARED_PACKAGES, TEMPLATE_DIRS } from '../utils/constants.js';
import { isNexuProject, copyWithMerge, log } from '../utils/helpers.js';

interface UpdateOptions {
  packages?: boolean;
  config?: boolean;
  workflows?: boolean;
  services?: boolean;
  all?: boolean;
  dryRun?: boolean;
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

  // Determine what to update
  const updateAll =
    options.all ||
    (!options.packages && !options.config && !options.workflows && !options.services);

  const updateTargets = {
    packages: updateAll || options.packages,
    config: updateAll || options.config,
    workflows: updateAll || options.workflows,
    services: updateAll || options.services,
  };

  // Show what will be updated
  console.log('Components to update:');
  if (updateTargets.packages) console.log(chalk.cyan('  - Shared packages'));
  if (updateTargets.config) console.log(chalk.cyan('  - Configuration files'));
  if (updateTargets.workflows) console.log(chalk.cyan('  - GitHub workflows'));
  if (updateTargets.services) console.log(chalk.cyan('  - Docker services'));
  console.log('');

  if (options.dryRun) {
    log('Dry run mode - no changes will be made', 'info');
    return;
  }

  // Confirm
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with update?',
      default: true,
    },
  ]);

  if (!confirm) {
    log('Update cancelled.', 'warn');
    return;
  }

  // Download latest template to temp directory
  const tempDir = path.join(os.tmpdir(), `nexu-update-${Date.now()}`);
  const downloadSpinner = ora('Downloading latest template...').start();

  try {
    const emitter = degit(`${REPO_URL}#${REPO_BRANCH}`, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(tempDir);
    downloadSpinner.succeed('Latest template downloaded');
  } catch (error) {
    downloadSpinner.fail('Failed to download template');
    console.error(error);
    process.exit(1);
  }

  // Update packages
  if (updateTargets.packages) {
    await updatePackages(projectDir, tempDir);
  }

  // Update config
  if (updateTargets.config) {
    await updateConfig(projectDir, tempDir);
  }

  // Update workflows
  if (updateTargets.workflows) {
    await updateWorkflows(projectDir, tempDir);
  }

  // Update services
  if (updateTargets.services) {
    await updateServices(projectDir, tempDir);
  }

  // Cleanup temp directory
  fs.removeSync(tempDir);

  console.log('\n' + chalk.green.bold('✨ Update complete!\n'));
  console.log('Run ' + chalk.cyan('pnpm install') + ' to install any new dependencies.');
  console.log('');
}

async function updatePackages(projectDir: string, tempDir: string): Promise<void> {
  const spinner = ora('Updating shared packages...').start();

  // Get list of existing packages
  const existingPackages = fs.existsSync(path.join(projectDir, 'packages'))
    ? fs
        .readdirSync(path.join(projectDir, 'packages'))
        .filter(f => fs.statSync(path.join(projectDir, 'packages', f)).isDirectory())
    : [];

  // Ask which packages to update
  const { selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Select packages to update:',
      choices: SHARED_PACKAGES.map(pkg => ({
        name: pkg + (existingPackages.includes(pkg) ? ' (update)' : ' (add new)'),
        value: pkg,
        checked: existingPackages.includes(pkg),
      })),
    },
  ]);

  spinner.start('Updating packages...');

  for (const pkg of selectedPackages) {
    const srcDir = path.join(tempDir, 'packages', pkg);
    const destDir = path.join(projectDir, 'packages', pkg);

    if (fs.existsSync(srcDir)) {
      // Backup existing package.json to preserve local changes
      let existingPkgJson = null;
      const pkgJsonPath = path.join(destDir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        existingPkgJson = fs.readJsonSync(pkgJsonPath);
      }

      // Copy new package
      fs.copySync(srcDir, destDir, { overwrite: true });

      // Restore version from existing package.json
      if (existingPkgJson) {
        const newPkgJson = fs.readJsonSync(pkgJsonPath);
        newPkgJson.version = existingPkgJson.version;
        fs.writeJsonSync(pkgJsonPath, newPkgJson, { spaces: 2 });
      }
    }
  }

  spinner.succeed(`Updated ${selectedPackages.length} packages`);
}

async function updateConfig(projectDir: string, tempDir: string): Promise<void> {
  const spinner = ora('Updating configuration files...').start();

  const configFiles = TEMPLATE_DIRS.config;
  let updated = 0;

  for (const file of configFiles) {
    const srcFile = path.join(tempDir, file);
    const destFile = path.join(projectDir, file);

    if (fs.existsSync(srcFile)) {
      fs.copySync(srcFile, destFile, { overwrite: true });
      updated++;
    }
  }

  // Update husky
  const huskySrc = path.join(tempDir, '.husky');
  const huskyDest = path.join(projectDir, '.husky');
  if (fs.existsSync(huskySrc)) {
    fs.copySync(huskySrc, huskyDest, { overwrite: true });
  }

  // Update VSCode settings
  const vscodeSrc = path.join(tempDir, '.vscode');
  const vscodeDest = path.join(projectDir, '.vscode');
  if (fs.existsSync(vscodeSrc)) {
    fs.copySync(vscodeSrc, vscodeDest, { overwrite: true });
  }

  spinner.succeed(`Updated ${updated} configuration files`);
}

async function updateWorkflows(projectDir: string, tempDir: string): Promise<void> {
  const spinner = ora('Updating GitHub workflows...').start();

  // Update workflows
  const workflowsSrc = path.join(tempDir, '.github', 'workflows');
  const workflowsDest = path.join(projectDir, '.github', 'workflows');
  if (fs.existsSync(workflowsSrc)) {
    fs.ensureDirSync(workflowsDest);
    fs.copySync(workflowsSrc, workflowsDest, { overwrite: true });
  }

  // Update actions
  const actionsSrc = path.join(tempDir, '.github', 'actions');
  const actionsDest = path.join(projectDir, '.github', 'actions');
  if (fs.existsSync(actionsSrc)) {
    fs.ensureDirSync(actionsDest);
    fs.copySync(actionsSrc, actionsDest, { overwrite: true });
  }

  // Update dependabot
  const dependabotSrc = path.join(tempDir, '.github', 'dependabot.yml');
  const dependabotDest = path.join(projectDir, '.github', 'dependabot.yml');
  if (fs.existsSync(dependabotSrc)) {
    fs.copySync(dependabotSrc, dependabotDest, { overwrite: true });
  }

  spinner.succeed('Updated GitHub workflows and actions');
}

async function updateServices(projectDir: string, tempDir: string): Promise<void> {
  const spinner = ora('Updating Docker services...').start();

  const servicesSrc = path.join(tempDir, 'services');
  const servicesDest = path.join(projectDir, 'services');

  if (fs.existsSync(servicesSrc)) {
    // Merge services directory
    fs.ensureDirSync(servicesDest);
    copyWithMerge(servicesSrc, servicesDest, true);
  }

  spinner.succeed('Updated Docker services');
}
