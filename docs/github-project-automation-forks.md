# Automatisation du Project pour les PR venant d'un fork

Le workflow `.github/workflows/project-issue-preprod-forks.yml` complète le workflow utilisé sur `preprod` pour les PR internes. Il traite les pull requests venant d'un fork lorsqu'elles sont fusionnées dans `preprod`.

Le workflow est installé sur la branche par défaut `main` et utilise `pull_request_target`. Il ne fait aucun checkout du dépôt et n'exécute aucun code venant du fork ; seul le script du workflow interroge l'API GitHub pour vérifier les références à une Issue avant de modifier le Project.

Il requiert le secret Actions `PROJECT_TOKEN`, configuré dans les paramètres du dépôt avec le scope `project`. Fusionner cette PR dans `main` avant de fusionner une PR issue d'un fork dans `preprod`.
