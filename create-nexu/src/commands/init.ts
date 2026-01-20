import path from 'path';
import { fileURLToPath } from 'url';

import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

import { SHARED_PACKAGES } from '../utils/constants.js';
import { exec, execInherit, log, getInstallCommand, getRunCommand } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InitOptions {
  template: string;
  skipInstall?: boolean;
  skipGit?: boolean;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
}

function getTemplateDir(): string {
  // In production (installed package), templates are at ../../templates
  // In development (src), templates are at ../../../templates
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

export async function init(projectName: string | undefined, options: InitOptions): Promise<void> {
  console.log(chalk.bold('\n🚀 Create Nexu Monorepo\n'));

  // Check if using current directory
  const useCurrentDir = projectName === '.';
  let projectDir: string;

  if (useCurrentDir) {
    projectDir = process.cwd();
    projectName = path.basename(projectDir);

    // Check if directory is not empty
    const files = fs.readdirSync(projectDir).filter(f => !f.startsWith('.'));
    if (files.length > 0) {
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Current directory is not empty. Continue anyway?`,
          default: false,
        },
      ]);

      if (!proceed) {
        log('Aborted.', 'warn');
        process.exit(0);
      }
    }
  } else {
    // Get project name if not provided
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
      projectName = answers.projectName as string;
    }

    projectDir = path.resolve(process.cwd(), projectName);

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
  }

  // Select package manager
  let packageManager = options.packageManager;
  if (!packageManager) {
    const { pm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'pm',
        message: 'Select package manager:',
        choices: [
          { name: 'pnpm (recommended)', value: 'pnpm' },
          { name: 'npm', value: 'npm' },
          { name: 'yarn', value: 'yarn' },
        ],
        default: 'pnpm',
      },
    ]);
    packageManager = pm;
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

  // Copy template
  const spinner = ora('Copying template...').start();

  try {
    const templateDir = getTemplateDir();
    fs.copySync(templateDir, projectDir);
    spinner.succeed('Template copied');
  } catch (error) {
    spinner.fail('Failed to copy template');
    console.error(error);
    process.exit(1);
  }

  // Update package.json with project name and remove packageManager field
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = fs.readJsonSync(packageJsonPath);
  packageJson.name = projectName;

  // Remove the packageManager field to let users use any package manager
  delete packageJson.packageManager;

  // Remove unselected features from package.json
  if (!features.includes('changesets')) {
    delete packageJson.scripts['changeset'];
    delete packageJson.scripts['version-packages'];
    delete packageJson.scripts['release'];
    delete packageJson.devDependencies['@changesets/cli'];
  }
  if (!features.includes('husky')) {
    delete packageJson.scripts['prepare'];
    delete packageJson.devDependencies['husky'];
    delete packageJson.devDependencies['lint-staged'];
    delete packageJson['lint-staged'];
  }

  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });

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

  // Create workspace config based on package manager
  if (packageManager === 'yarn') {
    // Remove pnpm-workspace.yaml and create package.json workspaces
    fs.removeSync(path.join(projectDir, 'pnpm-workspace.yaml'));
    fs.removeSync(path.join(projectDir, '.npmrc'));
    const updatedPkg = fs.readJsonSync(packageJsonPath);
    updatedPkg.workspaces = ['apps/*', 'packages/*'];
    fs.writeJsonSync(packageJsonPath, updatedPkg, { spaces: 2 });
  } else if (packageManager === 'npm') {
    // Remove pnpm-workspace.yaml and create package.json workspaces
    fs.removeSync(path.join(projectDir, 'pnpm-workspace.yaml'));
    fs.removeSync(path.join(projectDir, '.npmrc'));
    const updatedPkg = fs.readJsonSync(packageJsonPath);
    updatedPkg.workspaces = ['apps/*', 'packages/*'];
    fs.writeJsonSync(packageJsonPath, updatedPkg, { spaces: 2 });
  }

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
  const runCmd = getRunCommand(packageManager!);
  if (!options.skipInstall) {
    console.log(chalk.blue(`\n📦 Installing dependencies with ${packageManager}...\n`));
    try {
      execInherit(getInstallCommand(packageManager!), projectDir);
      console.log(chalk.green('\n✓ Dependencies installed'));
    } catch {
      console.log(
        chalk.yellow(
          `\n! Failed to install dependencies. Run "${getInstallCommand(packageManager!)}" manually.`
        )
      );
    }
  }

  // Success message
  console.log('\n' + chalk.green.bold('✨ Project created successfully!\n'));
  console.log('Next steps:\n');
  if (!useCurrentDir) {
    console.log(chalk.cyan(`  cd ${projectName}`));
  }
  if (options.skipInstall) {
    console.log(chalk.cyan(`  ${getInstallCommand(packageManager!)}`));
  }
  console.log(chalk.cyan(`  ${runCmd} dev`));
  console.log('\nTo create an app:');
  console.log(chalk.cyan(`  ${runCmd} generate:app <name> <port>`));
  console.log('\nTo update with latest features:');
  console.log(chalk.cyan('  npx create-nexu update'));
  console.log('');
}
