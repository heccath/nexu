# Architecture

Ce document décrit l'architecture du monorepo Nexu.

## Vue d'ensemble

```
nexu/
├── apps/                    # Applications
├── packages/                # Packages partagés
├── services/                # Services Docker externes
├── create-nexu/             # CLI
├── scripts/                 # Scripts de build/automation
├── docker/                  # Configuration Docker principale
└── .github/                 # GitHub Actions workflows
```

## Composants principaux

### Apps (`apps/`)

Les applications sont des projets indépendants qui utilisent les packages partagés.

```
apps/
├── web/                     # Frontend (Next.js, Vite, etc.)
│   ├── src/
│   ├── docker/
│   │   └── Dockerfile
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── package.json
└── api/                     # Backend (Express, Fastify, etc.)
    ├── src/
    ├── docker/
    │   └── Dockerfile
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    └── package.json
```

**Conventions:**

- Nom du package: `@repo/<app-name>`
- Chaque app a son propre Dockerfile
- Les apps sont indépendantes et peuvent être déployées séparément

### Packages (`packages/`)

Les packages partagés sont des bibliothèques réutilisables.

```
packages/
├── cache/                   # Cache in-memory avec TTL
├── config/                  # Configurations ESLint/TypeScript
│   ├── eslint-config/
│   └── typescript-config/
├── constants/               # Constantes partagées
├── logger/                  # Logger structuré
├── result/                  # Try/catch fonctionnel
├── types/                   # Types TypeScript partagés
├── ui/                      # Composants React
└── utils/                   # Fonctions utilitaires
```

**Conventions:**

- Nom du package: `@repo/<package-name>`
- Chaque package expose un point d'entrée dans `src/index.ts`
- Les packages sont buildés avec `tsup`

### Services (`services/`)

Services Docker externes (bases de données, monitoring, etc.).

```
services/
├── docker-compose.yml       # Configuration avec profiles
├── postgres/
│   └── init/
├── prometheus/
│   └── prometheus.yml
└── grafana/
    └── dashboards/
```

**Profiles Docker:**

- `database`: PostgreSQL, Redis
- `messaging`: RabbitMQ, Kafka
- `monitoring`: Prometheus, Grafana
- `storage`: MinIO
- `search`: Elasticsearch
- `all`: Tous les services

### CLI (`create-nexu/`)

Outil CLI pour créer et gérer des projets Nexu.

```
create-nexu/
├── src/
│   ├── index.ts             # Point d'entrée
│   ├── commands/
│   │   ├── init.ts          # Création de projet
│   │   ├── update.ts        # Mise à jour
│   │   └── add.ts           # Ajout de composants
│   └── utils/
│       └── helpers.ts
├── templates/
│   └── default/             # Template par défaut
└── package.json
```

## Dépendances entre packages

```
┌─────────────────────────────────────────────────────┐
│                      APPS                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │
│  │   web   │  │   api   │  │   ...autres apps    │  │
│  └────┬────┘  └────┬────┘  └──────────┬──────────┘  │
│       │            │                   │            │
└───────┼────────────┼───────────────────┼────────────┘
        │            │                   │
        ▼            ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                    PACKAGES                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │
│  │  types  │  │  utils  │  │  logger │  │ cache  │  │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │
│  │   ui    │  │constants│  │ result  │  │ config │  │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘  │
└─────────────────────────────────────────────────────┘
```

**Règles de dépendances:**

1. Les apps peuvent dépendre de n'importe quel package
2. Les packages ne dépendent pas des apps
3. Les packages peuvent dépendre d'autres packages
4. `config` (eslint, typescript) sont des dépendances de dev

## Configuration

### Turborepo (`turbo.json`)

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Explications:**

- `^build`: Build les dépendances d'abord
- `outputs`: Fichiers à mettre en cache
- `persistent`: Pour les processus long-running (dev servers)

### Workspaces (`pnpm-workspace.yaml`)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'create-nexu'
```

### TypeScript

Chaque package hérite d'une config de base:

```json
// packages/*/tsconfig.json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

Configs disponibles:

- `@repo/typescript-config/base.json` - Configuration de base
- `@repo/typescript-config/node.json` - Pour Node.js
- `@repo/typescript-config/react.json` - Pour React/Next.js

### ESLint

```javascript
// packages/*/.eslintrc.js
module.exports = {
  extends: ['@repo/eslint-config/base'],
  // ...
};
```

Configs disponibles:

- `@repo/eslint-config/base` - Configuration de base
- `@repo/eslint-config/react` - Pour React

## Docker

### Architecture Docker

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
│                    (docker/docker-compose.yml)               │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │   apps/web/          │  │   apps/api/          │         │
│  │   docker-compose.yml │  │   docker-compose.yml │         │
│  └──────────────────────┘  └──────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    services/                                 │
│                    docker-compose.yml                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ postgres │  │  redis   │  │ rabbitmq │  │  grafana │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Dockerfile multi-stage

```dockerfile
# Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/<app>/package.json ./apps/<app>/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# Development
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/<app>
CMD ["pnpm", "dev"]

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/<app>

# Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/apps/<app>/dist ./dist
CMD ["node", "dist/index.js"]
```

## CI/CD

### Workflow GitHub Actions

```
.github/
└── workflows/
    ├── ci.yml               # Lint, test, build
    ├── deploy-dev.yml       # Déploiement dev
    ├── deploy-rec.yml       # Déploiement recette
    └── deploy-prod.yml      # Déploiement production
```

### Pipeline CI

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Lint   │ -> │  Test   │ -> │  Build  │ -> │  Push   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Branches et environnements

| Branche | Environnement | Trigger |
| ------- | ------------- | ------- |
| `dev`   | development   | Push    |
| `rec`   | recette       | Push    |
| `main`  | production    | Push    |

## Cache et performances

### Turborepo Remote Cache

```bash
# Configuration
npx turbo login
npx turbo link

# Variables d'environnement
TURBO_TOKEN=xxx
TURBO_TEAM=xxx
```

### Cache local

Les outputs sont cachés localement dans:

- `.turbo/` - Cache Turborepo
- `node_modules/.cache/` - Cache des outils

### Optimisations

1. **Parallel builds** - Turborepo exécute les tâches en parallèle
2. **Incremental builds** - Seuls les packages modifiés sont rebuild
3. **Remote caching** - Partage du cache entre CI et développeurs
4. **Hoisting** - pnpm hoist les dépendances communes

## Patterns de code

### Packages partagés

```typescript
// packages/utils/src/index.ts
export * from './string';
export * from './array';
export * from './object';

// packages/utils/src/string.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### Utilisation dans les apps

```typescript
// apps/web/src/utils.ts
import { capitalize } from '@repo/utils';
import type { User } from '@repo/types';
import { logger } from '@repo/logger';

export function formatUser(user: User): string {
  logger.debug('Formatting user', { userId: user.id });
  return capitalize(user.name);
}
```

### Error handling avec Result

```typescript
import { tryCatchAsync, match } from '@repo/result';

const result = await tryCatchAsync(() => fetchUser(id));

return match(result, {
  ok: user => ({ status: 200, body: user }),
  err: error => ({ status: 500, body: { error: error.message } }),
});
```

## Sécurité

### Bonnes pratiques

1. **Secrets** - Jamais de secrets hardcodés, utiliser les variables d'environnement
2. **Dependencies** - Audit régulier avec `pnpm audit`
3. **Types** - TypeScript strict mode activé
4. **Validation** - Validation des entrées avec zod ou similaire

### Audit automatique

```bash
# Audit complet
pnpm audit

# Vérification en CI
pnpm audit:security
```

### Gestion des secrets

```bash
# .env.local (non commité)
DATABASE_URL=postgres://...
API_KEY=xxx

# .env.example (commité)
DATABASE_URL=postgres://user:pass@localhost:5432/db
API_KEY=your-api-key
```

## Monitoring

### Logs structurés

```typescript
import { logger } from '@repo/logger';

logger.info('Request received', {
  method: req.method,
  path: req.path,
  userId: user?.id,
});
```

### Métriques

Prometheus et Grafana sont préconfigurés dans `services/`.

```bash
# Démarrer le monitoring
docker compose -f services/docker-compose.yml --profile monitoring up -d
```

### Health checks

Chaque app devrait exposer un endpoint `/health`:

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```
