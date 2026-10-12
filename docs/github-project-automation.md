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

## Créer les cartes des campagnes de recette

Quand un administrateur technique crée une campagne dans l’application,
celle-ci crée une Issue dans `Fadgag/lindependance` et l’ajoute au Project #1.
Le champ `Statut de recette` est initialisé à **À lancer** ; les étapes de suivi
sont **À lancer → À suivre → Validé**. Le statut général de développement de
l’Issue liée à une PR reste indépendant.

Le dépôt étant public, l’Issue est publique même si le Project est privé. La
carte contient uniquement un identifiant interne et un lien vers le tableau de
suivi protégé par authentification. Elle n’inclut ni le nom du salon, ni le nom
de la campagne, ni le lien public des testeurs, ni les invitations ou leurs
retours.

Pour activer cette intégration dans l’application hébergée, créer un jeton
distinct `GITHUB_PROJECT_TOKEN`, avec une date d’expiration et les accès
nécessaires pour créer des Issues dans le dépôt public et modifier le Project
privé (`public_repo` et `project` pour un Personal Access Token classique).
Le définir comme variable d’environnement serveur sur l’hébergement, sans
préfixe `NEXT_PUBLIC_`. Ne pas le confondre avec le secret Actions `PROJECT_TOKEN`,
qui ne donne accès qu’au Project. Vérifier également que le champ
`Statut de recette` existe dans le Project avec les options **À lancer**,
**À suivre** et **Validé**.
Configurer aussi `NEXTAUTH_URL` ou `NEXT_PUBLIC_APP_URL` avec l’adresse
canonique de l’application pour que chaque carte renvoie au suivi protégé.

Si le jeton ou le champ est indisponible, la campagne reste créée et l’interface
signale que sa carte n’a pas pu être générée. Une Issue créée dans le dépôt
public ne peut pas être rendue privée en l’ajoutant au Project privé.
