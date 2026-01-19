import path from 'path';
import { fileURLToPath } from 'url';

import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

import { SHARED_PACKAGES, SERVICES } from '../utils/constants.js';
import { isNexuProject, log } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AddOptions {
  name?: string;
}

type ComponentType = 'package' | 'service';

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

  const spinner = ora('Adding packages...').start();

  try {
    const templateDir = getTemplateDir();

    // Copy selected packages
    for (const pkg of selectedPackages) {
      const srcDir = path.join(templateDir, 'packages', pkg);
      const destDir = path.join(projectDir, 'packages', pkg);

      if (fs.existsSync(srcDir)) {
        fs.copySync(srcDir, destDir);
      }
    }

    spinner.succeed(`Added ${selectedPackages.length} package(s): ${selectedPackages.join(', ')}`);

    console.log('\nRun ' + chalk.cyan('pnpm install') + ' to install dependencies.');
  } catch (error) {
    spinner.fail('Failed to add packages');
    console.error(error);
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

  const spinner = ora('Adding services configuration...').start();

  try {
    const templateDir = getTemplateDir();

    // Copy services directory
    const srcServicesDir = path.join(templateDir, 'services');
    if (fs.existsSync(srcServicesDir)) {
      fs.copySync(srcServicesDir, servicesDir, { overwrite: false });
    }

    spinner.succeed(`Services configuration added`);

    console.log('\nAvailable services: ' + chalk.cyan(selectedServices.join(', ')));
    console.log(
      'Start with: ' +
        chalk.cyan('docker compose -f services/docker-compose.yml --profile <profile> up -d')
    );
  } catch (error) {
    spinner.fail('Failed to add services');
    console.error(error);
    process.exit(1);
  }
}
