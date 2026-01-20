module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nouvelle fonctionnalité
        'fix', // Correction de bug
        'docs', // Documentation
        'style', // Formatage (pas de changement de code)
        'refactor', // Refactorisation
        'perf', // Amélioration de performance
        'test', // Ajout de tests
        'build', // Changements de build
        'ci', // Changements CI
        'chore', // Maintenance
        'revert', // Annulation
        'build', // Changements de build
      ],
    ],
    'subject-case': [0], // Désactivé - accepte toutes les casses
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [0, 'always', Infinity],
  },
};
