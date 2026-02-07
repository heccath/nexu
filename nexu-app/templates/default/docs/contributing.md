# Guide de contribution

Merci de votre intérêt pour contribuer à Nexu ! Ce guide vous aidera à démarrer.

## Prérequis

- Node.js 20+
- pnpm 9+
- Git
- Docker (optionnel, pour les services)

## Installation

```bash
# Cloner le repository
git clone https://github.com/heccath/nexu.git
cd nexu

# Installer les dépendances
pnpm install

# Build les packages
pnpm build
```

## Workflow de développement

### 1. Créer une branche

```bash
# Depuis la branche dev
git checkout dev
git pull origin dev
git checkout -b feature/ma-fonctionnalite
```

### Conventions de nommage des branches

| Préfixe     | Usage                   |
| ----------- | ----------------------- |
| `feature/`  | Nouvelle fonctionnalité |
| `fix/`      | Correction de bug       |
| `docs/`     | Documentation           |
| `refactor/` | Refactorisation         |
| `test/`     | Tests                   |
| `chore/`    | Maintenance             |

### 2. Développer

```bash
# Lancer le mode dev
pnpm dev

# Dans un autre terminal, vérifier le code
pnpm lint
pnpm typecheck
pnpm test
```

### 3. Commiter

```bash
# Ajouter les fichiers
git add .

# Commiter (le message est validé par commitlint)
git commit -m "feat: add new feature"
```

### Conventions de commit

Format: `<type>: <description>`

| Type       | Description                           |
| ---------- | ------------------------------------- |
| `feat`     | Nouvelle fonctionnalité               |
| `fix`      | Correction de bug                     |
| `docs`     | Documentation                         |
| `style`    | Formatage (pas de changement de code) |
| `refactor` | Refactorisation                       |
| `perf`     | Amélioration des performances         |
| `test`     | Ajout ou modification de tests        |
| `build`    | Changements de build ou dépendances   |
| `ci`       | Configuration CI                      |
| `chore`    | Autres changements                    |

**Exemples:**

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login redirect issue"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify error handling"
```

### 4. Créer un changeset (si nécessaire)

Si vos changements affectent les packages publiés:

```bash
pnpm changeset
```

Suivez les instructions pour:

1. Sélectionner les packages affectés
2. Choisir le type de version (major, minor, patch)
3. Décrire les changements

### 5. Push et Pull Request

```bash
git push origin feature/ma-fonctionnalite
```

Créez une Pull Request vers `dev` sur GitHub.

## Structure des Pull Requests

### Titre

Utilisez le même format que les commits:

```
feat: add user authentication
```

### Description

```markdown
## Description

Brève description des changements.

## Changements

- Liste des modifications
- Fichiers ajoutés/modifiés
- Dépendances ajoutées

## Tests

Comment tester les changements:

1. Étape 1
2. Étape 2

## Checklist

- [ ] Tests ajoutés/mis à jour
- [ ] Documentation mise à jour
- [ ] Changeset créé (si applicable)
- [ ] Lint et typecheck passent
```

## Guidelines de code

### TypeScript

```typescript
// ✅ Bon
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Mauvais
function calculateTotal(items: any): any {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].price;
  }
  return sum;
}
```

**Règles:**

- Toujours typer les paramètres et retours
- Éviter `any`, préférer `unknown` si nécessaire
- Utiliser les types stricts

### Imports

```typescript
// ✅ Bon - imports organisés
import { useState, useEffect } from 'react';

import { Button } from '@repo/ui';
import { formatDate } from '@repo/utils';
import type { User } from '@repo/types';

import { UserCard } from './components/UserCard';
import { useUser } from './hooks/useUser';

// ❌ Mauvais - imports désorganisés
import { UserCard } from './components/UserCard';
import { useState, useEffect } from 'react';
import { Button } from '@repo/ui';
import { useUser } from './hooks/useUser';
```

**Ordre des imports:**

1. Modules Node.js natifs
2. Packages externes (react, etc.)
3. Packages du monorepo (@repo/\*)
4. Imports relatifs

### Nommage

| Type             | Convention       | Exemple           |
| ---------------- | ---------------- | ----------------- |
| Variables        | camelCase        | `userName`        |
| Constantes       | UPPER_SNAKE_CASE | `MAX_RETRIES`     |
| Fonctions        | camelCase        | `getUserById`     |
| Classes          | PascalCase       | `UserService`     |
| Interfaces/Types | PascalCase       | `UserProfile`     |
| Fichiers         | kebab-case       | `user-service.ts` |
| Composants React | PascalCase       | `UserCard.tsx`    |

### Commentaires

```typescript
// ✅ Bon - explique le "pourquoi"
// Skip validation for admin users as they have full access
if (user.role === 'admin') {
  return true;
}

// ❌ Mauvais - explique le "quoi" (évident)
// Check if user is admin
if (user.role === 'admin') {
  return true;
}
```

### Error handling

```typescript
// ✅ Bon - utiliser Result
import { tryCatchAsync, match } from '@repo/result';

const result = await tryCatchAsync(() => fetchUser(id));
return match(result, {
  ok: user => user,
  err: error => {
    logger.error('Failed to fetch user', { id, error });
    throw new AppError('USER_NOT_FOUND', error.message);
  },
});

// ❌ Mauvais - try/catch générique
try {
  const user = await fetchUser(id);
  return user;
} catch (e) {
  console.log('error');
  throw e;
}
```

## Tests

### Écrire des tests

```typescript
// packages/utils/src/__tests__/string.test.ts
import { describe, it, expect } from 'vitest';
import { capitalize, slugify } from '../string';

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('slugify', () => {
  it('should convert to lowercase kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
});
```

### Exécuter les tests

```bash
# Tous les tests
pnpm test

# Tests avec watch
pnpm test -- --watch

# Tests avec coverage
pnpm test:coverage

# Tests d'un package spécifique
pnpm test --filter=@repo/utils
```

## Ajouter un nouveau package

### 1. Créer la structure

```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

### 2. Créer package.json

```json
{
  "name": "@repo/my-package",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

### 3. Créer tsconfig.json

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Créer tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

### 5. Créer le code source

```typescript
// src/index.ts
export function myFunction(): string {
  return 'Hello from my-package!';
}
```

### 6. Installer les dépendances

```bash
cd ../..
pnpm install
```

## Ajouter une nouvelle app

Utilisez le script de génération:

```bash
pnpm generate:app my-app next 3000
```

Ou manuellement:

1. Créer le dossier dans `apps/`
2. Ajouter `package.json` avec `name: "@repo/my-app"`
3. Créer la configuration Docker
4. Mettre à jour `docker/docker-compose.yml`

## Debugging

### VS Code

Configuration recommandée `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Package",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/packages/${input:package}/src/index.ts",
      "runtimeArgs": ["-r", "tsx/cjs"],
      "console": "integratedTerminal"
    }
  ],
  "inputs": [
    {
      "id": "package",
      "type": "promptString",
      "description": "Package name"
    }
  ]
}
```

### Logs

```typescript
import { logger } from '@repo/logger';

// En développement
logger.debug('Debug info', { data });

// Activer les logs debug
LOG_LEVEL=debug pnpm dev
```

## Ressources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Changesets](https://github.com/changesets/changesets)

## Questions ?

Si vous avez des questions, n'hésitez pas à:

1. Ouvrir une issue sur GitHub
2. Demander dans les discussions
3. Contacter les mainteneurs
