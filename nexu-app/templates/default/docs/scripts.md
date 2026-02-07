# Documentation des Scripts

Ce document décrit les scripts disponibles dans le monorepo Nexu.

## Scripts npm (package.json)

### Développement

| Script  | Commande                             | Description                               |
| ------- | ------------------------------------ | ----------------------------------------- |
| `dev`   | `turbo dev`                          | Lance tous les apps en mode développement |
| `build` | `turbo build`                        | Build tous les packages et apps           |
| `clean` | `turbo clean && rm -rf node_modules` | Nettoie tous les caches et node_modules   |

### Qualité du code

| Script         | Commande           | Description                                |
| -------------- | ------------------ | ------------------------------------------ |
| `lint`         | `turbo lint`       | Vérifie le code avec ESLint                |
| `lint:fix`     | `turbo lint:fix`   | Corrige automatiquement les erreurs ESLint |
| `format`       | `prettier --write` | Formate le code avec Prettier              |
| `format:check` | `prettier --check` | Vérifie le formatage                       |
| `typecheck`    | `turbo typecheck`  | Vérifie les types TypeScript               |

### Tests

| Script          | Commande              | Description                       |
| --------------- | --------------------- | --------------------------------- |
| `test`          | `turbo test`          | Exécute tous les tests            |
| `test:coverage` | `turbo test:coverage` | Exécute les tests avec couverture |

### Docker

| Script         | Commande                                                 | Description                          |
| -------------- | -------------------------------------------------------- | ------------------------------------ |
| `docker:dev`   | `docker-compose -f docker/docker-compose.dev.yml up`     | Lance l'environnement de dev Docker  |
| `docker:build` | `docker-compose -f docker/docker-compose.prod.yml build` | Build les images de production       |
| `docker:prod`  | `docker-compose -f docker/docker-compose.prod.yml up -d` | Lance l'environnement de prod Docker |

### Génération et audit

| Script              | Commande                                 | Description                     |
| ------------------- | ---------------------------------------- | ------------------------------- |
| `generate:app`      | `node scripts/generate-app.mjs`          | Génère une nouvelle application |
| `generate:template` | `node scripts/generate-template.mjs`     | Génère le template CLI          |
| `audit`             | `node scripts/audit.mjs`                 | Audit complet du code           |
| `audit:security`    | `node scripts/audit.mjs --security`      | Audit de sécurité               |
| `audit:quality`     | `node scripts/audit.mjs --quality`       | Audit de qualité                |
| `audit:fix`         | `node scripts/audit.mjs --quality --fix` | Audit avec auto-correction      |

### Versioning

| Script             | Commande            | Description               |
| ------------------ | ------------------- | ------------------------- |
| `changeset`        | `changeset`         | Crée un nouveau changeset |
| `version-packages` | `changeset version` | Met à jour les versions   |
| `release`          | `changeset publish` | Publie les packages       |

---

## generate-app.mjs

Script pour créer une nouvelle application dans le monorepo avec support de multiples frameworks.

### Usage

```bash
# Mode interactif
pnpm generate:app

# Avec arguments
pnpm generate:app <nom> [framework] [port]
```

### Frameworks supportés

#### Frontend

| Framework     | Clé           | Port par défaut | Description                |
| ------------- | ------------- | --------------- | -------------------------- |
| Next.js       | `next`        | 3000            | Framework React full-stack |
| Vite + React  | `vite-react`  | 5173            | SPA React rapide           |
| Vite + Vue    | `vite-vue`    | 5173            | SPA Vue.js                 |
| Vite + Svelte | `vite-svelte` | 5173            | SPA Svelte                 |
| Nuxt          | `nuxt`        | 3000            | Framework Vue full-stack   |

#### Backend

| Framework  | Clé       | Port par défaut | Description                    |
| ---------- | --------- | --------------- | ------------------------------ |
| Express.js | `express` | 4000            | Framework Node.js classique    |
| Fastify    | `fastify` | 4000            | Framework Node.js performant   |
| Hono       | `hono`    | 4000            | Framework ultraléger           |
| NestJS     | `nestjs`  | 4000            | Framework TypeScript structuré |
| Empty      | `empty`   | 3000            | Projet Node.js vide            |

### Exemples

```bash
# Next.js sur le port 3000
pnpm generate:app web next 3000

# API Express sur le port 4000
pnpm generate:app api express 4000

# Vite + React sur le port 3001
pnpm generate:app dashboard vite-react 3001

# Mode interactif
pnpm generate:app
# > App name: web
# > Select framework: Next.js (frontend)
# > Port: 3000
```

### Fichiers créés

```
apps/<nom>/
├── src/
│   └── index.ts          # Point d'entrée (backend)
├── docker/
│   ├── Dockerfile        # Multi-stage build
│   └── nginx.conf        # Pour Vite uniquement
├── docker-compose.yml    # Configuration dev
├── docker-compose.prod.yml # Configuration prod
├── package.json
└── tsconfig.json
```

### Actions automatiques

1. **Création du projet** via le CLI du framework (si disponible)
2. **Configuration package.json** avec le préfixe `@repo/`
3. **Génération Dockerfile** optimisé pour le framework
4. **Configuration Docker Compose** pour dev et prod
5. **Mise à jour** du `docker/docker-compose.yml` principal
6. **Installation des dépendances** (si setup manuel)

### Templates de code

#### Express.js

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from my-app!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
```

#### Fastify

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });
const port = parseInt(process.env.PORT || '4000', 10);

await fastify.register(cors);

fastify.get('/', async () => {
  return { message: 'Hello from my-app!' };
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

await fastify.listen({ port, host: '0.0.0.0' });
```

#### Hono

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
const port = parseInt(process.env.PORT || '4000', 10);

app.use('*', cors());

app.get('/', c => c.json({ message: 'Hello from my-app!' }));
app.get('/health', c => c.json({ status: 'ok' }));

serve({ fetch: app.fetch, port });
```

---

## audit.mjs

Script d'audit de code pour vérifier la sécurité et la qualité du codebase.

### Usage

```bash
# Audit complet
pnpm audit

# Options spécifiques
pnpm audit --security    # Sécurité uniquement
pnpm audit --quality     # Qualité uniquement
pnpm audit --deps        # Dépendances uniquement
pnpm audit --secrets     # Détection de secrets
pnpm audit --fix         # Auto-correction ESLint
pnpm audit --verbose     # Sortie détaillée
pnpm audit --app=<name>  # Auditer une app spécifique
```

### Options

| Option         | Alias | Description                     |
| -------------- | ----- | ------------------------------- |
| `--all`        | `-a`  | Exécute tous les checks         |
| `--security`   | `-s`  | Vulnérabilités + secrets        |
| `--quality`    | `-q`  | ESLint + TypeScript             |
| `--deps`       | `-d`  | Outdated + unused + licenses    |
| `--secrets`    |       | Détection de secrets uniquement |
| `--fix`        |       | Auto-correction ESLint          |
| `--verbose`    | `-v`  | Affichage détaillé              |
| `--app=<name>` |       | Auditer une app spécifique      |
| `--help`       | `-h`  | Afficher l'aide                 |

### Checks effectués

#### 1. Vulnérabilités des dépendances

Utilise `npm audit`, `pnpm audit` ou `yarn audit` selon le gestionnaire de packages détecté.

```bash
# Sortie exemple
▶ Dependency Vulnerabilities

✓ No vulnerabilities found
# ou
✗ Found 2 critical and 5 high vulnerabilities
```

#### 2. Détection de secrets

Recherche de patterns sensibles dans le code:

| Type           | Pattern                                |
| -------------- | -------------------------------------- |
| AWS Access Key | `AKIA[0-9A-Z]{16}`                     |
| AWS Secret Key | Clé de 40 caractères avec contexte AWS |
| GitHub Token   | `gh[pousr]_[A-Za-z0-9_]{36,}`          |
| API Key        | `api[_-]?key...`                       |
| Private Key    | `-----BEGIN ... PRIVATE KEY-----`      |
| JWT Token      | `eyJ...`                               |
| Database URL   | `postgres://user:pass@...`             |
| Password       | `password=...`                         |

**Exclusions automatiques:**

- `node_modules`, `.git`, `dist`, `build`
- Fichiers binaires (`.png`, `.jpg`, etc.)
- Fichiers de lock (`pnpm-lock.yaml`, etc.)
- Commentaires et documentation
- Valeurs placeholder (`example`, `your-`)

#### 3. ESLint

Exécute ESLint sur tout le projet via Turborepo.

```bash
# Sans fix
pnpm audit --quality

# Avec fix
pnpm audit --quality --fix
```

#### 4. TypeScript

Vérifie les types avec `tsc --noEmit`.

```bash
▶ TypeScript Type Checking

✓ No TypeScript errors found
# ou
✗ Found 12 TypeScript errors
```

#### 5. Dépendances obsolètes

Vérifie les packages qui ont des mises à jour disponibles.

```bash
▶ Outdated Dependencies

! 15 outdated packages (3 major updates available)
```

#### 6. Dépendances inutilisées

Utilise `depcheck` pour trouver les dépendances non utilisées.

**Note:** Nécessite `npm install -g depcheck`

```bash
▶ Unused Dependencies

! Found 5 potentially unused dependencies
```

#### 7. Conformité des licences

Vérifie que les licences des dépendances sont compatibles.

**Note:** Nécessite `npm install -g license-checker`

Licences problématiques signalées:

- GPL, AGPL, LGPL
- SSPL, BUSL
- Commons Clause

```bash
▶ License Compliance

✓ All licenses are compliant
# ou
! Found 2 packages with restrictive licenses
```

### Résumé

À la fin de l'audit, un résumé est affiché:

```
📊 Audit Summary

  ✓ Dependency Vulnerabilities
  ✓ Secrets Detection
  ✓ ESLint
  ✓ TypeScript
  ! Outdated Dependencies (15 outdated, 3 major)
  ! Unused Dependencies (5 unused)
  ✓ License Compliance

Results: 4 passed, 2 warnings, 0 errors
```

### Code de sortie

- `0` : Succès (pas d'erreurs)
- `1` : Échec (au moins une erreur critique)

---

## generate-template.mjs

Script pour générer le template du CLI à partir du monorepo actuel.

### Usage

```bash
pnpm generate:template
```

### Fonctionnement

1. **Supprime** l'ancien template dans `nexu-app/templates/default/`
2. **Copie** les fichiers du monorepo
3. **Exclut** les fichiers non nécessaires
4. **Modifie** le `package.json` avec un placeholder
5. **Nettoie** les références au CLI

### Fichiers exclus

- `node_modules`
- `.git`
- `.turbo`
- `*.log`
- `.DS_Store`
- `dist`
- `coverage`
- `.next`
- `pnpm-lock.yaml`
- `nexu-app` (le CLI lui-même)
- `.claude`
- `README.md`
- `.lintstagedrc.cjs`

### Modifications automatiques

1. **package.json**: `"name": "nexu"` → `"name": "{{PROJECT_NAME}}"`
2. **pnpm-workspace.yaml**: Supprime `- 'nexu-app'`
3. **eslintrc.js**: Supprime `'nexu-app'` des ignorePatterns
4. **Scripts supprimés**: `generate:template`, `publish:cli`

---

## publish-cli.mjs

Script pour publier le CLI nexu-app sur npm.

### Usage

```bash
pnpm publish:cli
```

### Prérequis

- Être connecté à npm (`npm login`)
- Avoir les droits de publication sur le package

### Étapes

1. Génère le template (`generate:template`)
2. Build le CLI (`tsup`)
3. Publie sur npm (`npm publish`)

---

## Utilitaires communs

### lib/package-manager.mjs

Module partagé pour la détection du gestionnaire de packages.

```javascript
import { detectPackageManager, getRunCommand, getExecCommand } from './lib/package-manager.mjs';

const pm = detectPackageManager(ROOT_DIR); // 'pnpm' | 'yarn' | 'npm'
const runCmd = getRunCommand(pm); // 'pnpm' | 'yarn' | 'npm run'
const execCmd = getExecCommand(pm); // 'pnpm exec' | 'yarn' | 'npx'
```

### Détection

La détection se base sur:

1. Présence de `pnpm-lock.yaml` → pnpm
2. Présence de `yarn.lock` → yarn
3. Sinon → npm
