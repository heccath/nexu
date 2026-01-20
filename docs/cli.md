# CLI create-nexu

`create-nexu` est un outil en ligne de commande pour créer et gérer des projets monorepo Nexu.

## Installation

```bash
# Créer un nouveau projet (installation automatique via npx)
npx create-nexu my-project

# Ou via npm create
npm create nexu my-project
```

## Commandes

### `create-nexu [project-name]`

Crée un nouveau projet Nexu.

```bash
npx create-nexu my-project
```

#### Options

| Option                      | Description                            |
| --------------------------- | -------------------------------------- |
| `-t, --template <template>` | Template à utiliser (default, minimal) |
| `--skip-install`            | Ne pas installer les dépendances       |
| `--skip-git`                | Ne pas initialiser Git                 |

#### Exemples

```bash
# Projet standard
npx create-nexu my-project

# Sans installation des dépendances
npx create-nexu my-project --skip-install

# Sans initialisation Git
npx create-nexu my-project --skip-git

# Les deux
npx create-nexu my-project --skip-install --skip-git
```

### `create-nexu update`

Met à jour un projet Nexu existant avec les dernières fonctionnalités du template.

```bash
cd my-project
npx create-nexu update
```

#### Options

| Option               | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `-p, --packages`     | Mettre à jour uniquement les packages partagés         |
| `-c, --config`       | Mettre à jour uniquement les fichiers de configuration |
| `-w, --workflows`    | Mettre à jour uniquement les GitHub workflows          |
| `-s, --services`     | Mettre à jour uniquement les services Docker           |
| `--scripts`          | Mettre à jour uniquement le dossier scripts            |
| `-d, --dependencies` | Mettre à jour uniquement les dépendances package.json  |
| `--all`              | Mettre à jour tout (comportement par défaut)           |
| `--dry-run`          | Afficher les changements sans les appliquer            |
| `--preview`          | Afficher les différences détaillées avant d'appliquer  |

#### Fonctionnalités

1. **Détection des changements**
   - Fichiers ajoutés (nouveaux dans le template)
   - Fichiers modifiés (différents du template)
   - Fichiers supprimés (présents localement mais plus dans le template)

2. **Prévisualisation**
   - Mode `--preview` pour voir les différences ligne par ligne
   - Mode `--dry-run` pour simuler sans modifier

3. **Sélection interactive**
   - Choisissez quels fichiers mettre à jour
   - Confirmez avant d'appliquer les changements

4. **Mise à jour des dépendances**
   - Nouvelles dépendances ajoutées au template
   - Nouveaux scripts ajoutés au template
   - Mise à jour automatique du package.json

5. **Installation automatique**
   - Exécute `pnpm install` si le package.json a été modifié

#### Exemples

```bash
# Mise à jour complète avec prévisualisation
npx create-nexu update --preview

# Mise à jour des packages partagés uniquement
npx create-nexu update --packages

# Mise à jour des configs et workflows
npx create-nexu update --config --workflows

# Simulation (voir sans appliquer)
npx create-nexu update --dry-run

# Mise à jour des dépendances uniquement
npx create-nexu update --dependencies
```

#### Catégories de fichiers

| Catégorie   | Fichiers inclus                                          |
| ----------- | -------------------------------------------------------- |
| `packages`  | `packages/**/*`                                          |
| `config`    | `*.json`, `*.js`, `*.cjs`, `*.yaml`, `*.yml` à la racine |
| `workflows` | `.github/**/*`                                           |
| `services`  | `services/**/*`                                          |
| `scripts`   | `scripts/**/*`                                           |
| `docker`    | `docker/**/*`                                            |

### `create-nexu add <component>`

Ajoute un composant au projet.

```bash
npx create-nexu add package
npx create-nexu add service
```

#### Composants disponibles

| Composant | Description                                        |
| --------- | -------------------------------------------------- |
| `package` | Ajoute un nouveau package partagé dans `packages/` |
| `service` | Ajoute un nouveau service Docker dans `services/`  |

#### Options

| Option              | Description      |
| ------------------- | ---------------- |
| `-n, --name <name>` | Nom du composant |

#### Exemples

```bash
# Ajouter un package (interactif)
npx create-nexu add package

# Ajouter un package avec un nom
npx create-nexu add package --name my-utils

# Ajouter un service Docker
npx create-nexu add service
```

## Flux de travail typique

### Nouveau projet

```bash
# 1. Créer le projet
npx create-nexu my-project

# 2. Aller dans le projet
cd my-project

# 3. Créer une application
pnpm generate:app web next 3000

# 4. Démarrer le développement
pnpm dev
```

### Mise à jour d'un projet existant

```bash
# 1. Aller dans le projet
cd my-project

# 2. Prévisualiser les changements
npx create-nexu update --preview

# 3. Appliquer les mises à jour souhaitées
npx create-nexu update

# 4. Vérifier que tout fonctionne
pnpm build
pnpm test
```

### Ajouter des fonctionnalités

```bash
# Ajouter un nouveau package partagé
npx create-nexu add package --name validators

# Ajouter un service Docker (Redis, etc.)
npx create-nexu add service
```

## Structure du template

Le template par défaut inclut:

```
template/
├── apps/                    # Dossier pour les applications (vide)
├── packages/                # Packages partagés
│   ├── cache/
│   ├── config/
│   ├── constants/
│   ├── logger/
│   ├── result/
│   ├── types/
│   ├── utils/
│   └── ui/
├── scripts/                 # Scripts utilitaires
│   ├── generate-app.mjs
│   └── audit.mjs
├── services/                # Services Docker externes
├── docker/                  # Configuration Docker principale
├── .github/                 # Workflows GitHub Actions
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── ... (fichiers de config)
```

## Développement du CLI

### Structure du code

```
create-nexu/
├── src/
│   ├── index.ts            # Point d'entrée
│   ├── commands/
│   │   ├── init.ts         # Commande de création
│   │   ├── update.ts       # Commande de mise à jour
│   │   └── add.ts          # Commande d'ajout
│   └── utils/
│       └── helpers.ts      # Fonctions utilitaires
├── templates/
│   └── default/            # Template par défaut
└── package.json
```

### Générer le template

Pour mettre à jour le template avec les derniers changements du monorepo:

```bash
pnpm generate:template
```

Ce script:

1. Copie les fichiers du monorepo vers `create-nexu/templates/default/`
2. Exclut `node_modules`, `.git`, `dist`, etc.
3. Remplace le nom du projet par un placeholder
4. Supprime les scripts spécifiques au développement du CLI

### Publier le CLI

```bash
pnpm publish:cli
```

Ce script:

1. Génère le template
2. Build le CLI avec tsup
3. Publie sur npm

## Dépendances

Le CLI utilise:

| Package     | Usage                        |
| ----------- | ---------------------------- |
| `commander` | Parsing des arguments CLI    |
| `inquirer`  | Prompts interactifs          |
| `chalk`     | Couleurs dans le terminal    |
| `ora`       | Spinners de chargement       |
| `fs-extra`  | Opérations fichiers avancées |
| `diff`      | Comparaison de fichiers      |
| `semver`    | Gestion des versions         |

## Troubleshooting

### "Template not found"

Le template doit être généré avant de publier:

```bash
pnpm generate:template
```

### "Permission denied"

Assurez-vous d'avoir les droits d'écriture dans le dossier cible:

```bash
sudo chown -R $(whoami) /path/to/project
```

### "pnpm not found" lors de l'installation

Le CLI utilise pnpm par défaut. Installez-le:

```bash
npm install -g pnpm
```

### Les fichiers ne sont pas mis à jour

Vérifiez que vous êtes bien dans un projet Nexu (présence de `turbo.json` et `pnpm-workspace.yaml`).
