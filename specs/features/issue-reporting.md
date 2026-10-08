# Spécification — Signalement de problèmes

**Statut :** Implémentée — migration et recette bêta à effectuer
**Source :** `AMELIORATIONS.md` — « Permettre à l'utilisateur de signaler un problème ou un bug »

## Objectif

Permettre au personnel connecté et aux clients connectés au portail de décrire
un problème, puis permettre aux administrateurs techniques de le consulter et
de le traiter dans un tableau de bord interne.

## Parcours et accès

- Le personnel connecté et les clients ayant vérifié leur adresse e-mail dans
  le portail peuvent ouvrir le formulaire depuis leur espace.
- Le signalement est créé pour l'organisation provenant de la session staff ou
  du jeton signé du portail ; une organisation fournie par le navigateur ne fait
  jamais autorité.
- L'expéditeur est résolu côté serveur. Son nom et son adresse e-mail sont
  enregistrés avec le signalement et ne sont visibles que par `TECH_ADMIN`.
- `/issue-reports` et ses API sont réservés au rôle `TECH_ADMIN`. Le tableau
  permet de consulter le signalement et de suivre son traitement avec les états
  `NOUVEAU`, `EN_COURS` et `RÉSOLU`.
- Le menu TECH_ADMIN conserve les liens « Signalements » et « Campagnes de test »
  et propose un sélecteur commun : « Tous les domaines » ou une ou plusieurs
  organisations, y compris celles sans signalement. Le choix est conservé lors
  du passage entre ces deux outils ; « Tous les domaines » est sélectionné par
  défaut.
- Le filtre réduit la liste des signalements et des campagnes ainsi que les
  indicateurs de campagne. Dans les signalements, un filtre permet d'afficher
  tous les états ou uniquement les signalements non résolus (`NOUVEAU` et
  `EN_COURS`).
- Une campagne est préremplie avec l'organisation sélectionnée si une seule
  l'est ; en vue globale ou avec plusieurs organisations sélectionnées, le
  TECH_ADMIN choisit explicitement la cible. Il peut toujours choisir toute
  organisation disponible.
- Le filtre est une commodité d'interface, pas une autorisation supplémentaire :
  les pages et API restent protégées par `TECH_ADMIN`. Les identifiants
  d'organisation sont validés côté serveur ; l'absence de filtre conserve la
  vue globale.
- Les requêtes de listing/modification n'exposent pas les signalements d'une
  organisation aux utilisateurs de cette organisation.

## Formulaire et données collectées

- Le formulaire demande un titre, la description de ce qui s'est passé et les
  étapes pour reproduire le problème. Les champs texte sont bornés et validés
  avec Zod.
- Le formulaire indique avant envoi que le nom, l'e-mail, l'organisation et les
  informations techniques seront transmis à l'équipe technique, et demande de
  ne pas inclure de données sensibles dans la description.
- Les diagnostics joints sont limités à la page (chemin sans requête ni
  fragment), la date/heure de réception, la version de l'application et les
  erreurs JavaScript récentes capturées dans la page. Les messages d'erreur
  sont expurgés ; aucun stack trace, contenu de formulaire, jeton, adresse IP
  ou en-tête de requête n'est conservé.
- Les erreurs techniques sont collectées localement et jointes uniquement lors
  d'un envoi explicite du formulaire. Les erreurs envoyées sont également
  nettoyées et bornées côté serveur.
- Limiter les envois par expéditeur et répondre clairement en cas de limitation
  ou d'échec.

## Conservation et suppression

- Les signalements non résolus sont conservés pour le traitement.
- Un signalement résolu est supprimé 90 jours après sa résolution. Le nettoyage
  est exécuté à l'accès au tableau `TECH_ADMIN` et la suppression est exclue
  des résultats immédiatement après l'échéance.

## Critères d'acceptation

1. Un membre du personnel authentifié peut soumettre un signalement depuis son
   espace ; un client peut le faire depuis le portail après vérification de son
   adresse e-mail.
2. Le serveur associe l'organisation et l'identité réelles de l'expéditeur sans
   utiliser d'identifiants d'organisation fournis dans le corps de la requête.
3. Un `TECH_ADMIN` peut voir les signalements de toutes les organisations,
   consulter les coordonnées de l'expéditeur et changer leur état ; un autre
   rôle ne peut accéder ni au tableau ni aux API de gestion.
4. Le formulaire explique les données transmises. Le signalement conserve la
   page, l'heure, la version et des messages d'erreur expurgés, sans stack trace,
   secrets, adresse IP ou contenu saisi dans d'autres formulaires.
5. Une entrée résolue est supprimée à l'échéance de 90 jours ; une entrée
   ouverte n'est pas supprimée automatiquement.
6. Les tests couvrent l'authentification des deux types d'expéditeur, le
   cloisonnement `organizationId`, l'accès `TECH_ADMIN`, les limites de champs,
   l'expurgation, le changement d'état, la limitation de débit et l'expiration.

## Données et API

- Ajouter une table `IssueReport` avec organisation facultative (les comptes
  techniques peuvent ne pas appartenir à un salon), type, nom/e-mail de
  l'expéditeur, champs du formulaire, diagnostic borné, état, dates de création
  et de résolution. Ajouter une migration Prisma additive.
- `POST /api/issue-reports` accepte le formulaire et les diagnostics
  expurgés ; identité, organisation, version et date de réception sont dérivées
  ou vérifiées côté serveur.
- `GET /api/issue-reports` et `PATCH /api/issue-reports/[id]` sont réservés à
  `TECH_ADMIN`. La mise à jour accepte uniquement un changement d'état autorisé.
- Ne pas appliquer la migration à une base distante pendant l'implémentation.
