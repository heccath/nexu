# Nexu

Monorepo moderne avec Turborepo, pnpm et Docker.

## Stack

- **Turborepo** - Orchestration monorepo
- **pnpm** - Gestionnaire de packages
- **TypeScript** - Typage statique
- **ESLint + Prettier** - Qualité du code
- **Husky** - Git hooks
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

| Commande            | Description        |
| ------------------- | ------------------ |
| `pnpm dev`          | Développement      |
| `pnpm build`        | Build              |
| `pnpm lint`         | Vérifier le code   |
| `pnpm lint:fix`     | Corriger le code   |
| `pnpm format`       | Formater           |
| `pnpm typecheck`    | Vérifier les types |
| `pnpm test`         | Tests              |
| `pnpm clean`        | Nettoyer           |
| `pnpm generate:app` | Créer une app      |

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

### @repo/types

```typescript
import type { User, ApiResponse } from '@repo/types';
```

### @repo/utils

```typescript
import { capitalize, slugify, formatDate } from '@repo/utils';
```

### @repo/ui

```typescript
import { Button, Card, Input } from '@repo/ui';
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
