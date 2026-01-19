import { Command } from 'commander';

import { add } from './commands/add.js';
import { init } from './commands/init.js';
import { update } from './commands/update.js';

const program = new Command();

program
  .name('create-nexu')
  .description('CLI to create and update Nexu monorepo projects')
  .version('1.0.0');

// Default command: create a new project
program
  .argument('[project-name]', 'Name of the project to create')
  .option('-t, --template <template>', 'Template to use (default, minimal)', 'default')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-git', 'Skip git initialization')
  .action((projectName, options) => {
    // If no subcommand and no project name, show help
    if (!projectName && process.argv.length <= 2) {
      program.help();
    } else {
      return init(projectName, options);
    }
  });

// Update command
program
  .command('update')
  .description('Update an existing Nexu project with latest features')
  .option('-p, --packages', 'Update only shared packages')
  .option('-c, --config', 'Update only configuration files')
  .option('-w, --workflows', 'Update only GitHub workflows')
  .option('-s, --services', 'Update only Docker services')
  .option('--all', 'Update everything (default)')
  .option('--dry-run', 'Show what would be updated without making changes')
  .action(update);

// Add command
program
  .command('add <component>')
  .description('Add a component to your project (package, service)')
  .option('-n, --name <name>', 'Name for the component')
  .action(add);

program.parse();
