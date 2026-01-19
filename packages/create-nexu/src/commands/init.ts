import path from 'path';

import chalk from 'chalk';
import degit from 'degit';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

import { REPO_URL, REPO_BRANCH, SHARED_PACKAGES } from '../utils/constants.js';
import { exec, log } from '../utils/helpers.js';

interface InitOptions {
  template: string;
  skipInstall?: boolean;
  skipGit?: boolean;
}

export async function init(projectName: string | undefined, options: InitOptions): Promise<void> {
  console.log(chalk.bold('\n🚀 Create Nexu Monorepo\n'));

  // Get project name
  if (!projectName) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: 'my-nexu-app',
        validate: (input: string) => {
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Project name can only contain lowercase letters, numbers, and hyphens';
          }
          return true;
        },
      },
    ]);
    projectName = answers.projectName;
  }

  const projectDir = path.resolve(process.cwd(), projectName);

  // Check if directory exists
  if (fs.existsSync(projectDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${projectName} already exists. Overwrite?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      log('Aborted.', 'warn');
      process.exit(0);
    }

    fs.removeSync(projectDir);
  }

  // Select packages to include
  const { selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Select packages to include:',
      choices: SHARED_PACKAGES.map(pkg => ({
        name: pkg,
        value: pkg,
        checked: true,
      })),
    },
  ]);

  // Select features
  const { features } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select additional features:',
      choices: [
        { name: 'Docker services (PostgreSQL, Redis, etc.)', value: 'services', checked: true },
        { name: 'GitHub Actions workflows', value: 'workflows', checked: true },
        { name: 'Changesets (versioning)', value: 'changesets', checked: true },
        { name: 'Husky (git hooks)', value: 'husky', checked: true },
        { name: 'VSCode settings', value: 'vscode', checked: true },
      ],
    },
  ]);

  // Clone template
  const spinner = ora('Downloading template...').start();

  try {
    const emitter = degit(`${REPO_URL}#${REPO_BRANCH}`, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(projectDir);
    spinner.succeed('Template downloaded');
  } catch (error) {
    spinner.fail('Failed to download template');
    console.error(error);
    process.exit(1);
  }

  // Remove unselected packages
  const packagesToRemove = SHARED_PACKAGES.filter(pkg => !selectedPackages.includes(pkg));
  if (packagesToRemove.length > 0) {
    const removeSpinner = ora('Removing unselected packages...').start();
    for (const pkg of packagesToRemove) {
      const pkgDir = path.join(projectDir, 'packages', pkg);
      if (fs.existsSync(pkgDir)) {
        fs.removeSync(pkgDir);
      }
    }
    removeSpinner.succeed('Removed unselected packages');
  }

  // Remove unselected features
  if (!features.includes('services')) {
    fs.removeSync(path.join(projectDir, 'services'));
  }
  if (!features.includes('workflows')) {
    fs.removeSync(path.join(projectDir, '.github', 'workflows'));
    fs.removeSync(path.join(projectDir, '.github', 'actions'));
  }
  if (!features.includes('changesets')) {
    fs.removeSync(path.join(projectDir, '.changeset'));
  }
  if (!features.includes('husky')) {
    fs.removeSync(path.join(projectDir, '.husky'));
  }
  if (!features.includes('vscode')) {
    fs.removeSync(path.join(projectDir, '.vscode'));
  }

  // Update package.json
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = fs.readJsonSync(packageJsonPath);
  packageJson.name = projectName;

  // Remove scripts for unselected features
  if (!features.includes('changesets')) {
    delete packageJson.scripts['changeset'];
    delete packageJson.scripts['version-packages'];
    delete packageJson.devDependencies['@changesets/cli'];
  }
  if (!features.includes('husky')) {
    delete packageJson.scripts['prepare'];
    delete packageJson.devDependencies['husky'];
  }

  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });

  // Remove create-nexu package from the new project (it's meta)
  fs.removeSync(path.join(projectDir, 'packages', 'create-nexu'));

  // Initialize git
  if (!options.skipGit) {
    const gitSpinner = ora('Initializing git repository...').start();
    try {
      exec('git init', projectDir);
      exec('git add .', projectDir);
      exec('git commit -m "Initial commit from create-nexu"', projectDir);
      gitSpinner.succeed('Git repository initialized');
    } catch {
      gitSpinner.warn('Failed to initialize git repository');
    }
  }

  // Install dependencies
  if (!options.skipInstall) {
    const installSpinner = ora('Installing dependencies...').start();
    try {
      exec('pnpm install', projectDir);
      installSpinner.succeed('Dependencies installed');
    } catch {
      installSpinner.warn('Failed to install dependencies. Run "pnpm install" manually.');
    }
  }

  // Success message
  console.log('\n' + chalk.green.bold('✨ Project created successfully!\n'));
  console.log('Next steps:\n');
  console.log(chalk.cyan(`  cd ${projectName}`));
  if (options.skipInstall) {
    console.log(chalk.cyan('  pnpm install'));
  }
  console.log(chalk.cyan('  pnpm dev'));
  console.log('\nTo create an app:');
  console.log(chalk.cyan('  pnpm generate:app <name> <port>'));
  console.log('\nTo update with latest features:');
  console.log(chalk.cyan('  npx create-nexu update'));
  console.log('');
}
