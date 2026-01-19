export const REPO_URL = 'heccath/nexu';
export const REPO_BRANCH = 'main';

export const TEMPLATE_DIRS = {
  packages: 'packages',
  services: 'services',
  workflows: '.github/workflows',
  actions: '.github/actions',
  config: [
    '.eslintrc.js',
    '.eslintignore',
    '.prettierrc',
    '.prettierignore',
    'tsconfig.json',
    'turbo.json',
    'vitest.config.ts',
    'commitlint.config.js',
  ],
  husky: '.husky',
  vscode: '.vscode',
  docker: 'docker',
  scripts: 'scripts',
  changeset: '.changeset',
};

export const SHARED_PACKAGES = [
  'cache',
  'config',
  'constants',
  'logger',
  'result',
  'types',
  'ui',
  'utils',
];

export const SERVICES = [
  'postgres',
  'redis',
  'rabbitmq',
  'kafka',
  'prometheus',
  'grafana',
  'minio',
  'elasticsearch',
];
