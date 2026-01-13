# Changesets

Ce dossier contient les changesets pour le versioning des packages.

## Utilisation

### Créer un changeset

```bash
pnpm changeset
```

Suivez les instructions pour :

1. Sélectionner les packages modifiés
2. Choisir le type de version (major, minor, patch)
3. Écrire un résumé des changements

### Versionner les packages

```bash
pnpm changeset version
```

Cette commande :

- Met à jour les versions dans package.json
- Génère les CHANGELOGs
- Supprime les fichiers changeset utilisés

### Publier (si nécessaire)

```bash
pnpm changeset publish
```
