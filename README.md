# Nexu

Monorepo moderne avec Turborepo, pnpm et Docker.

## Démarrage rapide

```bash
# Créer un nouveau projet
npm create nexu my-project
cd my-project

# Ou avec npx
npx create-nexu my-project

# Mettre à jour un projet existant
npx create-nexu update
```

## Stack

- **Turborepo** - Orchestration monorepo + remote caching
- **pnpm** - Gestionnaire de packages
- **TypeScript** - Typage statique
- **Vitest** - Tests unitaires
- **ESLint + Prettier** - Qualité du code
- **Husky** - Git hooks
- **Changesets** - Versioning des packages
- **Dependabot** - Mises à jour automatiques
- **Docker** - Containerisation

## Structure

```
nexu/
├── apps/                    # Applications
│   └── <app-name>/
│       ├── src/
│       ├── docker/
│       │   └── Dockerfile
│       ├── docker-compose.yml
│       └── docker-compose.prod.yml
├── packages/                # Packages partagés
│   ├── cache/              # Cache in-memory avec TTL
│   ├── config/             # Configs ESLint/TypeScript
│   ├── constants/          # Constantes partagées
│   ├── logger/             # Logger structuré
│   ├── result/             # Try/catch fonctionnel
│   ├── types/              # Types partagés
│   ├── utils/              # Utilitaires
│   └── ui/                 # Composants UI
├── services/               # Services Docker externes
│   ├── docker-compose.yml  # Config avec profiles
│   ├── postgres/           # Config PostgreSQL
│   ├── prometheus/         # Config Prometheus
│   └── grafana/            # Config Grafana
├── create-nexu/            # CLI create-nexu
│   ├── src/                # Source du CLI
│   └── templates/          # Templates du monorepo
├── docker/
│   └── docker-compose.yml  # Compose principal
└── scripts/
    ├── generate-app.mjs    # Générateur d'apps
    └── audit.mjs           # Audit sécurité/qualité
```

## Documentation

- [Documentation CLI](docs/cli.md) - Guide d'utilisation du CLI create-nexu
- [Documentation Scripts](docs/scripts.md) - Scripts disponibles
- [Architecture](docs/architecture.md) - Vue d'ensemble de l'architecture
- [Contribution](docs/contributing.md) - Guide de contribution

## Commandes

| Commande                | Description                |
| ----------------------- | -------------------------- |
| `pnpm dev`              | Développement              |
| `pnpm build`            | Build                      |
| `pnpm lint`             | Vérifier le code           |
| `pnpm lint:fix`         | Corriger le code           |
| `pnpm format`           | Formater                   |
| `pnpm typecheck`        | Vérifier les types         |
| `pnpm test`             | Tests                      |
| `pnpm clean`            | Nettoyer                   |
| `pnpm generate:app`     | Créer une app (interactif) |
| `pnpm audit`            | Audit complet              |
| `pnpm audit:security`   | Audit sécurité             |
| `pnpm audit:quality`    | Audit qualité              |
| `pnpm changeset`        | Créer un changeset         |
| `pnpm version-packages` | Versionner les packages    |

### Filtrer par package

```bash
pnpm dev --filter=@repo/<nom>
pnpm build --filter=@repo/<nom>
```

## Créer une application

```bash
# Mode interactif (recommandé)
pnpm generate:app

# Avec arguments
pnpm generate:app <nom> <framework> <port>
```

### Frameworks disponibles

**Frontend:**
| Framework | Commande |
|-----------|----------|
| Next.js | `pnpm generate:app web next 3000` |
| Vite + React | `pnpm generate:app web vite-react 3000` |
| Vite + Vue | `pnpm generate:app web vite-vue 3000` |
| Vite + Svelte | `pnpm generate:app web vite-svelte 3000` |
| Nuxt | `pnpm generate:app web nuxt 3000` |

**Backend:**
| Framework | Commande |
|-----------|----------|
| Express.js | `pnpm generate:app api express 4000` |
| Fastify | `pnpm generate:app api fastify 4000` |
| Hono | `pnpm generate:app api hono 4000` |
| NestJS | `pnpm generate:app api nestjs 4000` |
| Empty (Node.js) | `pnpm generate:app api empty 4000` |

### Fichiers créés

```
apps/<nom>/
├── src/
├── docker/
│   ├── Dockerfile
│   └── nginx.conf      # Pour Vite uniquement
├── docker-compose.yml
└── docker-compose.prod.yml
```

L'app est automatiquement ajoutée au `docker/docker-compose.yml` principal.

## Audit de code

La commande `pnpm audit` exécute plusieurs vérifications sur votre codebase:

```bash
# Audit complet
pnpm audit

# Sécurité uniquement (vulnérabilités + secrets)
pnpm audit:security

# Qualité uniquement (ESLint + TypeScript)
pnpm audit:quality

# Avec auto-correction
pnpm audit:fix

# Options avancées
pnpm audit --verbose           # Affichage détaillé
pnpm audit --app=my-app        # Auditer une app spécifique
pnpm audit --deps              # Dépendances uniquement
pnpm audit --secrets           # Détection de secrets
```

### Vérifications effectuées

| Check                   | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| Vulnérabilités          | npm/pnpm/yarn audit                                   |
| Secrets                 | Détection de clés API, tokens, mots de passe          |
| ESLint                  | Analyse de qualité du code                            |
| TypeScript              | Vérification des types                                |
| Dépendances obsolètes   | Packages à mettre à jour                              |
| Dépendances inutilisées | Packages non utilisés (requiert depcheck)             |
| Licences                | Vérification de conformité (requiert license-checker) |

## Docker

### Une application

```bash
# Dev
cd apps/<nom>
docker compose up

# Prod
cd apps/<nom>
docker compose -f docker-compose.prod.yml up -d
```

### Toutes les applications

```bash
pnpm docker:dev   # Dev
pnpm docker:prod  # Prod
```

### Services externes

Les services externes (PostgreSQL, Redis, etc.) sont gérés dans le dossier `services/`.

```bash
# Démarrer les services de base de données
docker compose -f services/docker-compose.yml --profile database up -d

# Démarrer tous les services
docker compose -f services/docker-compose.yml --profile all up -d

# Arrêter les services
docker compose -f services/docker-compose.yml --profile database down
```

**Profiles disponibles:**

| Profile      | Services                   |
| ------------ | -------------------------- |
| `database`   | PostgreSQL, Redis          |
| `messaging`  | RabbitMQ, Kafka, Zookeeper |
| `monitoring` | Prometheus, Grafana        |
| `storage`    | MinIO (S3-compatible)      |
| `search`     | Elasticsearch              |
| `all`        | Tous les services          |

**Interfaces web:**

| Service    | URL                    | Credentials     |
| ---------- | ---------------------- | --------------- |
| RabbitMQ   | http://localhost:15672 | nexu / nexu     |
| Grafana    | http://localhost:3001  | admin / admin   |
| MinIO      | http://localhost:9001  | nexu / nexu1234 |
| Prometheus | http://localhost:9090  | -               |

## Packages partagés

Les packages dans `packages/` sont utilisables dans toutes les apps.

### Utilisation dans une app

1. Ajouter la dépendance dans `apps/<nom>/package.json` :

```json
{
  "dependencies": {
    "@repo/utils": "workspace:*",
    "@repo/types": "workspace:*",
    "@repo/ui": "workspace:*"
  }
}
```

2. Installer les dépendances :

```bash
pnpm install
```

3. Importer dans le code :

```typescript
import { capitalize, slugify } from '@repo/utils';
import type { User, ApiResponse } from '@repo/types';
import { Button, Card } from '@repo/ui';
```

### Packages disponibles

| Package                   | Description                            |
| ------------------------- | -------------------------------------- |
| `@repo/types`             | Types TypeScript partagés              |
| `@repo/utils`             | Fonctions utilitaires                  |
| `@repo/ui`                | Composants React                       |
| `@repo/logger`            | Logger structuré avec couleurs et JSON |
| `@repo/cache`             | Cache in-memory avec TTL               |
| `@repo/constants`         | Constantes partagées                   |
| `@repo/result`            | Try/catch fonctionnel                  |
| `@repo/eslint-config`     | Configuration ESLint                   |
| `@repo/typescript-config` | Configuration TypeScript               |

### Exemples d'utilisation

#### Logger

```typescript
import { logger, createLogger } from '@repo/logger';

// Logger par défaut
logger.info('Application started');
logger.error('Something went wrong', { error });

// Logger personnalisé
const appLogger = createLogger({
  prefix: 'api',
  level: 'debug',
  colors: true,
  json: false,
});
appLogger.debug('Request received');
appLogger.warn('Deprecated endpoint used');
```

#### Cache

```typescript
import { createCache, memoize } from '@repo/cache';

const cache = createCache<User>({ ttl: 60000, maxSize: 100 });
cache.set('user:1', user);
const cached = cache.get('user:1');

// Memoization
const expensiveFn = memoize(async (id: string) => fetchUser(id), { ttl: 5000 });
```

#### Result

```typescript
import { tryCatch, tryCatchAsync, ok, err, match, unwrapOr } from '@repo/result';

// Sync
const result = tryCatch(() => JSON.parse(data));
if (result.ok) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// Async
const userResult = await tryCatchAsync(() => fetchUser(id));
const user = unwrapOr(userResult, defaultUser);

// Pattern matching
const message = match(result, {
  ok: data => `Success: ${data}`,
  err: error => `Error: ${error.message}`,
});
```

#### Constants

```typescript
import { HTTP_STATUS, ERROR_CODE, USER_ROLE, REGEX } from '@repo/constants';

if (response.status === HTTP_STATUS.NOT_FOUND) {
  // Handle 404
}

if (REGEX.EMAIL.test(email)) {
  // Valid email
}
```

## CLI create-nexu

Le CLI `create-nexu` permet de créer et mettre à jour des projets Nexu.

### Commandes principales

```bash
# Créer un nouveau projet
npx create-nexu my-project
npx create-nexu my-project --skip-install  # Sans installation
npx create-nexu my-project --skip-git      # Sans init git

# Mettre à jour un projet existant
npx create-nexu update
npx create-nexu update --preview           # Prévisualiser les changements
npx create-nexu update --dry-run           # Simulation

# Mettre à jour des parties spécifiques
npx create-nexu update --packages          # Packages partagés
npx create-nexu update --config            # Fichiers de config
npx create-nexu update --workflows         # GitHub workflows
npx create-nexu update --scripts           # Scripts
npx create-nexu update --dependencies      # Dépendances package.json

# Ajouter des composants
npx create-nexu add package                # Nouveau package partagé
npx create-nexu add service                # Nouveau service Docker
```

Voir [docs/cli.md](docs/cli.md) pour plus de détails.

## Workflow Git

### Branches

| Branche | Environnement | Description      |
| ------- | ------------- | ---------------- |
| `dev`   | development   | Développement    |
| `rec`   | recette       | Tests/validation |
| `main`  | production    | Production       |

### Flux de travail

```
feature/* ──PR──> dev ──PR──> rec ──PR──> main
```

### CI/CD

- **CI** : Lint, format, typecheck, test, build sur chaque push/PR
- **Deploy** : Build Docker + push vers GHCR sur push vers dev/rec/main
- **Dependabot** : PRs automatiques pour les mises à jour de dépendances

## Conventions Git

```
<type>: <description>

feat:     Nouvelle fonctionnalité
fix:      Correction de bug
docs:     Documentation
style:    Formatage
refactor: Refactorisation
perf:     Performance
test:     Tests
build:    Build/deps
ci:       CI/CD
chore:    Maintenance
```

**Exemples:**

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login redirect issue"
```

## Tests

```bash
pnpm test              # Tous les tests
pnpm test:coverage     # Avec coverage
```

### Écrire un test

```typescript
// src/index.test.ts
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

## Changesets (Versioning)

Pour documenter les changements lors d'une PR :

```bash
pnpm changeset
```

Avant une release :

```bash
pnpm version-packages  # Met à jour les versions et CHANGELOGs
```

## License

MIT
