# nexu-app

CLI pour créer et mettre à jour des projets Nexu monorepo.

## Installation

```bash
# Pas besoin d'installer, utiliser directement avec npx
npx nexu-app init my-project

# Ou installer globalement
npm install -g nexu-app
```

## Commandes

### `nexu-app init [project-name]`

Crée un nouveau projet Nexu monorepo.

```bash
# Interactif
npx nexu-app init

# Avec nom de projet
npx nexu-app init my-app

# Options
npx nexu-app init my-app --skip-install  # Ne pas installer les dépendances
npx nexu-app init my-app --skip-git      # Ne pas initialiser git
```

Le wizard interactif permet de:

- Choisir les packages à inclure
- Sélectionner les fonctionnalités (services Docker, workflows, etc.)

### `nexu-app update`

Met à jour un projet existant avec les dernières fonctionnalités.

```bash
# Mettre à jour tout
npx nexu-app update

# Mettre à jour seulement les packages
npx nexu-app update --packages

# Mettre à jour seulement les configs
npx nexu-app update --config

# Mettre à jour seulement les workflows
npx nexu-app update --workflows

# Mettre à jour seulement les services Docker
npx nexu-app update --services

# Voir ce qui serait mis à jour sans faire de changements
npx nexu-app update --dry-run
```

### `nexu-app add <component>`

Ajoute un composant à un projet existant.

```bash
# Ajouter un package
npx nexu-app add package
npx nexu-app add package --name logger

# Ajouter les services Docker
npx nexu-app add service
```

## Workflow typique

### Nouveau projet

```bash
# 1. Créer le projet
npx nexu-app init my-app
cd my-app

# 2. Créer une application
pnpm generate:app api 4000
pnpm generate:app web 3000

# 3. Développer
pnpm dev
```

### Mise à jour d'un projet existant

```bash
# 1. Depuis la racine du projet
cd my-existing-project

# 2. Mettre à jour
npx nexu-app update

# 3. Installer les nouvelles dépendances
pnpm install
```

### Ajouter des fonctionnalités

```bash
# Ajouter un nouveau package partagé
npx nexu-app add package

# Ajouter les services Docker
npx nexu-app add service
```

## Packages disponibles

| Package     | Description                      |
| ----------- | -------------------------------- |
| `cache`     | Cache in-memory avec TTL         |
| `config`    | Configurations ESLint/TypeScript |
| `constants` | Constantes partagées             |
| `logger`    | Logger avec niveaux et couleurs  |
| `result`    | Try/catch fonctionnel            |
| `types`     | Types TypeScript partagés        |
| `ui`        | Composants React                 |
| `utils`     | Fonctions utilitaires            |

## Services Docker disponibles

| Service       | Profile    | Description                   |
| ------------- | ---------- | ----------------------------- |
| PostgreSQL    | database   | Base de données relationnelle |
| Redis         | database   | Cache et store clé-valeur     |
| RabbitMQ      | messaging  | Message broker (AMQP)         |
| Kafka         | messaging  | Event streaming               |
| Prometheus    | monitoring | Métriques et alerting         |
| Grafana       | monitoring | Visualisation des métriques   |
| MinIO         | storage    | Stockage S3-compatible        |
| Elasticsearch | search     | Moteur de recherche           |

## Publication

Pour publier une nouvelle version:

```bash
cd packages/nexu-app
pnpm build
npm publish
```
