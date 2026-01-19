import { Command } from 'commander';

import { add } from './commands/add.js';
import { init } from './commands/init.js';
import { update } from './commands/update.js';

const program = new Command();

program
  .name('create-nexu')
  .description('CLI to create and update Nexu monorepo projects')
  .version('1.0.0');

program
  .command('init [project-name]')
  .description('Create a new Nexu monorepo project')
  .option('-t, --template <template>', 'Template to use (default, minimal)', 'default')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-git', 'Skip git initialization')
  .action(init);

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

program
  .command('add <component>')
  .description('Add a component to your project (package, service, workflow)')
  .option('-n, --name <name>', 'Name for the component')
  .action(add);

program.parse();
