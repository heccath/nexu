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
| `@repo/eslint-config`     | Configuration ESLint      |
| `@repo/typescript-config` | Configuration TypeScript  |

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
