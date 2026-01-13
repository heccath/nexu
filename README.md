# Nexu

Monorepo moderne avec Turborepo, pnpm et Docker.

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
│   ├── config/             # Configs ESLint/TypeScript
│   ├── types/              # Types partagés
│   ├── utils/              # Utilitaires
│   └── ui/                 # Composants UI
├── docker/
│   └── docker-compose.yml  # Compose principal (inclut toutes les apps)
└── scripts/
    └── generate-app.sh     # Générateur d'apps
```

## Installation

```bash
pnpm install
pnpm build
```

## Créer une application

```bash
pnpm generate:app <nom> <port>
```

**Exemples:**

```bash
pnpm generate:app web 3000
pnpm generate:app api 4000
```

Fichiers créés:

```
apps/<nom>/
├── src/
├── docker/
│   └── Dockerfile
├── docker-compose.yml
└── docker-compose.prod.yml
```

L'app est automatiquement ajoutée au `docker/docker-compose.yml` principal.

## Commandes

| Commande                | Description             |
| ----------------------- | ----------------------- |
| `pnpm dev`              | Développement           |
| `pnpm build`            | Build                   |
| `pnpm lint`             | Vérifier le code        |
| `pnpm lint:fix`         | Corriger le code        |
| `pnpm format`           | Formater                |
| `pnpm typecheck`        | Vérifier les types      |
| `pnpm test`             | Tests                   |
| `pnpm clean`            | Nettoyer                |
| `pnpm generate:app`     | Créer une app           |
| `pnpm changeset`        | Créer un changeset      |
| `pnpm version-packages` | Versionner les packages |

### Filtrer par package

```bash
pnpm dev --filter=@repo/<nom>
pnpm build --filter=@repo/<nom>
```

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

| Package                   | Description               |
| ------------------------- | ------------------------- |
| `@repo/types`             | Types TypeScript partagés |
| `@repo/utils`             | Fonctions utilitaires     |
| `@repo/ui`                | Composants React          |
| `@repo/logger`            | Logger avec niveaux       |
| `@repo/cache`             | Cache in-memory avec TTL  |
| `@repo/constants`         | Constantes partagées      |
| `@repo/result`            | Try/catch fonctionnel     |
| `@repo/eslint-config`     | Configuration ESLint      |
| `@repo/typescript-config` | Configuration TypeScript  |

### Exemples d'utilisation

#### Types

```typescript
import type { User, ApiResponse, PaginatedResponse } from '@repo/types';

const user: User = { id: '1', name: 'John', email: 'john@example.com' };

const response: ApiResponse<User> = {
  success: true,
  data: user,
};
```

#### Utils

```typescript
import { capitalize, slugify, truncate, chunk, isEmpty } from '@repo/utils';

capitalize('hello'); // "Hello"
slugify('Hello World'); // "hello-world"
truncate('Long text here', 10); // "Long te..."
chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
isEmpty({}); // true
```

#### UI

```tsx
import { Button, Card, Input } from '@repo/ui';

<Button variant="primary" onClick={handleClick}>
  Click me
</Button>

<Card title="Card Title">
  Content here
</Card>

<Input placeholder="Enter text" value={value} onChange={onChange} />
```

#### Logger

```typescript
import { logger, createLogger } from '@repo/logger';

logger.info('Application started');
logger.error('Something went wrong', { error });

const appLogger = createLogger({ prefix: 'api', level: 'debug' });
appLogger.debug('Request received');
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

// Wrap existing functions
const safeParseJSON = wrap(JSON.parse);
const parsed = safeParseJSON('{"name": "John"}');
```

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

1. Créer une branche feature depuis `dev`
2. PR vers `dev` → déploiement automatique en development
3. PR vers `rec` → déploiement automatique en recette
4. PR vers `main` → déploiement automatique en production

### CI/CD

- **CI** : Lint, format, typecheck, test, build sur chaque push/PR
- **Deploy** : Build Docker + push vers GHCR sur push vers dev/rec/main
- **Dependabot** : PRs automatiques pour les mises à jour de dépendances (lundi)

### Remote Caching (Turborepo)

Pour activer le cache partagé entre CI et développeurs :

1. Créer un compte sur [Vercel](https://vercel.com)
2. Lier le projet : `npx turbo login && npx turbo link`
3. Ajouter les secrets GitHub :
   - `TURBO_TOKEN` : Token Vercel
   - `TURBO_TEAM` : Nom de l'équipe (variable)

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

Suivez les instructions pour sélectionner les packages modifiés et le type de version (major/minor/patch).

Avant une release :

```bash
pnpm version-packages  # Met à jour les versions et CHANGELOGs
```

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
