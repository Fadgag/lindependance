# Automatisation du statut de préproduction

Le workflow `.github/workflows/project-issue-preprod.yml` s'exécute lorsqu'une pull request issue d'une branche du dépôt est fusionnée dans `preprod`. Il déplace vers `In preprod` les Issues du même dépôt qui :

- sont mentionnées par numéro dans le titre, la description ou les commits de la pull request ;
- ont bien un événement GitHub de référence croisée vers cette pull request ;
- sont présentes dans le GitHub Project #1 et ne sont pas terminées.

Le statut global `Done` et les Issues fermées ne sont pas remplacés. La campagne de recette conserve son champ indépendant `Statut de recette`.

Le workflow n'effectue aucun checkout du dépôt ; il exécute uniquement son script intégré. Comme le secret est utilisé par un événement `pull_request`, seules les pull requests de branches du dépôt sont traitées. Les pull requests venant d'un fork sont ignorées, car GitHub ne transmet pas les secrets Actions à ces événements. Les changements du workflow doivent donc être relus avec attention avant fusion.

## Activer l'accès au Project privé

Le Project #1 est privé. Le `GITHUB_TOKEN` standard du dépôt ne peut pas modifier ses champs ; le workflow attend donc un secret Actions `PROJECT_TOKEN`.

1. Créer un Personal Access Token classique depuis le compte Fadgag avec le scope `project` uniquement, et lui attribuer une date d'expiration.
2. Dans les paramètres du dépôt, ouvrir **Secrets and variables > Actions**, puis créer un secret nommé `PROJECT_TOKEN` avec ce jeton.
3. Ne jamais inscrire le jeton dans un fichier, un commit ou une conversation.

Tant que ce secret n'est pas disponible dans une exécution, le workflow émet un avertissement et n'effectue aucune modification. Une pull request doit être fusionnée après la mise en place du workflow et du secret pour déclencher la mise à jour.
