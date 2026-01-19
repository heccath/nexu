import os from 'os';
import path from 'path';

import chalk from 'chalk';
import degit from 'degit';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

import { REPO_URL, REPO_BRANCH, SHARED_PACKAGES, SERVICES } from '../utils/constants.js';
import { isNexuProject, log } from '../utils/helpers.js';

interface AddOptions {
  name?: string;
}

type ComponentType = 'package' | 'service';

export async function add(component: string, options: AddOptions): Promise<void> {
  console.log(chalk.bold('\n➕ Add Component\n'));

  const projectDir = process.cwd();

  // Verify this is a Nexu project
  if (!isNexuProject(projectDir)) {
    log('This does not appear to be a Nexu project.', 'error');
    process.exit(1);
  }

  const componentType = component.toLowerCase() as ComponentType;

  switch (componentType) {
    case 'package':
      await addPackage(projectDir, options.name);
      break;
    case 'service':
      await addService(projectDir, options.name);
      break;
    default:
      log(`Unknown component type: ${component}. Use 'package' or 'service'.`, 'error');
      process.exit(1);
  }
}

async function addPackage(projectDir: string, packageName?: string): Promise<void> {
  // Get existing packages
  const packagesDir = path.join(projectDir, 'packages');
  const existingPackages = fs.existsSync(packagesDir)
    ? fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory())
    : [];

  // Get available packages that are not already installed
  const availablePackages = SHARED_PACKAGES.filter(pkg => !existingPackages.includes(pkg));

  if (availablePackages.length === 0) {
    log('All packages are already installed.', 'info');
    return;
  }

  // Select package to add
  let selectedPackages: string[];

  if (packageName && availablePackages.includes(packageName)) {
    selectedPackages = [packageName];
  } else {
    const { packages } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'packages',
        message: 'Select packages to add:',
        choices: availablePackages.map(pkg => ({
          name: pkg,
          value: pkg,
        })),
        validate: (input: string[]) => {
          if (input.length === 0) {
            return 'Please select at least one package';
          }
          return true;
        },
      },
    ]);
    selectedPackages = packages;
  }

  // Download template
  const tempDir = path.join(os.tmpdir(), `nexu-add-${Date.now()}`);
  const spinner = ora('Downloading packages...').start();

  try {
    const emitter = degit(`${REPO_URL}#${REPO_BRANCH}`, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(tempDir);

    // Copy selected packages
    for (const pkg of selectedPackages) {
      const srcDir = path.join(tempDir, 'packages', pkg);
      const destDir = path.join(projectDir, 'packages', pkg);

      if (fs.existsSync(srcDir)) {
        fs.copySync(srcDir, destDir);
      }
    }

    spinner.succeed(`Added ${selectedPackages.length} package(s): ${selectedPackages.join(', ')}`);

    // Cleanup
    fs.removeSync(tempDir);

    console.log('\nRun ' + chalk.cyan('pnpm install') + ' to install dependencies.');
  } catch (error) {
    spinner.fail('Failed to add packages');
    console.error(error);
    fs.removeSync(tempDir);
    process.exit(1);
  }
}

async function addService(projectDir: string, serviceName?: string): Promise<void> {
  const servicesDir = path.join(projectDir, 'services');

  // Check if services directory exists
  if (!fs.existsSync(servicesDir)) {
    const { createServices } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createServices',
        message: 'Services directory does not exist. Create it?',
        default: true,
      },
    ]);

    if (!createServices) {
      return;
    }
  }

  // Select service to add
  let selectedServices: string[];

  if (serviceName && SERVICES.includes(serviceName)) {
    selectedServices = [serviceName];
  } else {
    const { services } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'services',
        message: 'Select services to configure:',
        choices: SERVICES.map(svc => ({
          name: svc,
          value: svc,
        })),
        validate: (input: string[]) => {
          if (input.length === 0) {
            return 'Please select at least one service';
          }
          return true;
        },
      },
    ]);
    selectedServices = services;
  }

  // Download template
  const tempDir = path.join(os.tmpdir(), `nexu-add-${Date.now()}`);
  const spinner = ora('Downloading services configuration...').start();

  try {
    const emitter = degit(`${REPO_URL}#${REPO_BRANCH}`, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(tempDir);

    // Copy services directory
    const srcServicesDir = path.join(tempDir, 'services');
    if (fs.existsSync(srcServicesDir)) {
      fs.copySync(srcServicesDir, servicesDir, { overwrite: false });
    }

    spinner.succeed(`Services configuration added`);

    // Cleanup
    fs.removeSync(tempDir);

    console.log('\nAvailable services: ' + chalk.cyan(selectedServices.join(', ')));
    console.log(
      'Start with: ' +
        chalk.cyan('docker compose -f services/docker-compose.yml --profile <profile> up -d')
    );
  } catch (error) {
    spinner.fail('Failed to add services');
    console.error(error);
    fs.removeSync(tempDir);
    process.exit(1);
  }
}
