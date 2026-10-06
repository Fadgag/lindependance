# Améliorations à suivre

Ce fichier suit les améliorations à traiter au fur et à mesure qu'elles sont repérées. Les statuts et priorités ci-dessous sont une proposition de tri fondée sur l'état du dépôt observé le 6 octobre 2026 ; ils ne remplacent pas les décisions produit.

### Légende de priorisation

- **P1 — prioritaire :** gêne ou bloque un parcours important, ou nécessite de vérifier une frontière d'environnement.
- **P2 — important :** amélioration utile, mais un parcours principal reste utilisable.
- **P3 — à cadrer :** dépend d'une décision produit, commerciale ou de support.

Les priorités proposées indiquent l'ordre de traitement, pas la taille des travaux.

## À traiter

### Ordre recommandé

Les P1 sont terminées. Pour les priorités restantes :

1. Compléter le parcours email client avec la fiche contact du salon (P2).
2. Étendre l'amélioration des messages d'erreur aux autres parcours (P2).
3. Simplifier le vocabulaire et revoir les formulations (P2).

Les autres sujets restent au backlog selon les priorités indiquées ci-dessous.

### Afficher des erreurs explicites dans les popups

- **Statut :** Partiellement couvert — le parcours checkout a reçu un traitement dédié ; les autres parcours n'ont pas encore été inventoriés.
- **Priorité proposée :** P2
- **Constat :** Certaines erreurs affichent un message générique comme `internalError`.
- **Amélioration souhaitée :** Afficher dans une popup un message clair qui explique le problème et, si possible, indique quoi faire ensuite.
- **État observé :** Le rapport `quality/review_report/review_2026-10-06_1126.md` confirme l'amélioration du checkout et précise que le reste de l'application n'a pas été audité pour ce besoin.
- **Critères d'acceptation :**
  - Le message est compréhensible pour la personne qui utilise l'application.
  - Le message aide à comprendre la prochaine étape ou à réessayer.
  - Les détails techniques ou sensibles ne sont pas exposés.

### Simplifier le vocabulaire et revoir les formulations au féminin

- **Statut :** À traiter
- **Priorité proposée :** P2
- **Constat :** Certains termes de l'interface sont jargonneux et les formulations sont au féminin partout.
- **Amélioration souhaitée :** Employer des termes accessibles et revoir les accords de genre selon les personnes et le contexte concernés.
- **Critères d'acceptation :**
  - Le vocabulaire de l'interface est compréhensible sans jargon inutile.
  - Les accords de genre sont cohérents avec les personnes ou les rôles désignés.

### Vérifier l'adresse e-mail lors de la prise de rendez-vous client

- **Statut :** Partiellement couvert — la vérification de l'email existe, mais l'information de contact du salon manque.
- **Priorité proposée :** P2
- **Constat :** Un client peut tenter de prendre un rendez-vous sans que son adresse e-mail existe dans la base.
- **Amélioration souhaitée :** Vérifier l'adresse e-mail saisie. Si elle ne correspond à aucun client, afficher un message invitant la personne à contacter le salon et présenter la fiche contact du salon.
- **État observé :** Le portail vérifie déjà l'email via un code et indique qu'aucune fiche client ne correspond, en invitant à contacter l'établissement. La fiche avec les coordonnées n'est pas affichée.
- **Critères d'acceptation :**
  - La présence de l'adresse e-mail dans la base est vérifiée lors de la prise de rendez-vous.
  - Si l'adresse n'est pas trouvée, un message clair invite le client à contacter le salon.
  - La fiche contact du salon (coordonnées) est affichée dans ce cas.
  - Le comportement de la prise de rendez-vous après l'affichage de ce message reste à préciser.

### Proposer un nom de domaine personnalisé en option payante

- **Statut :** À cadrer — dépend du modèle commercial et du processus de support.
- **Priorité proposée :** P3
- **Constat :** Le portail du salon utilise une adresse en `vercel.app`, et sa configuration sur Vercel et dans le DNS peut nécessiter l'intervention du support.
- **Amélioration souhaitée :** Permettre à chaque organisation de demander l'activation de son domaine personnalisé depuis Configuration → Portail. La demande crée un ticket au support ; le support accompagne ou effectue la configuration Vercel et DNS selon les accès disponibles. Prévoir une solution générique pour plusieurs salons, sans dépendre d'un domaine codé en dur.
- **Critères d'acceptation :**
  - Un membre autorisé peut saisir le domaine souhaité et soumettre une demande depuis Configuration → Portail.
  - Le ticket contient l'organisation concernée, le domaine demandé et les coordonnées utiles au suivi, sans exposer de secrets.
  - Le support peut suivre la demande et communiquer les enregistrements DNS à ajouter lorsque la gestion DNS n'est pas déléguée.
  - Le domaine est vérifié et associé à une seule organisation avant activation.
  - Le lien actuel avec slug reste utilisable jusqu'à l'activation du domaine personnalisé.
  - Le portail peut être résolu à partir du domaine personnalisé de chaque organisation, sans logique spécifique à un salon.
  - Le prix et les modalités de facturation éventuels sont définis.

### Personnaliser les messages envoyés par e-mail

- **Statut :** À traiter
- **Priorité proposée :** P2
- **Constat :** Les e-mails du portail client (code de connexion et confirmation de rendez-vous) utilisent des messages prédéfinis.
- **Amélioration souhaitée :** Permettre à chaque organisation de personnaliser depuis la configuration le contenu des e-mails envoyés à ses clients.
- **Critères d'acceptation :**
  - Le contenu des e-mails de code de connexion et de confirmation de rendez-vous peut être personnalisé dans la configuration.
  - Les valeurs par défaut restent disponibles si aucun texte personnalisé n'est défini.
  - Les informations dynamiques nécessaires (code, prestation, date et horaire du rendez-vous) restent correctement insérées dans le message.

### Permettre à l'utilisateur de signaler un problème ou un bug

- **Statut :** À cadrer — définir le canal de traitement et les limites des données de diagnostic.
- **Priorité proposée :** P2
- **Constat :** L'utilisateur ne dispose pas d'un endroit dédié pour signaler un problème rencontré dans l'application.
- **Amélioration souhaitée :** Ajouter un formulaire de signalement qui demande ce qui s'est passé et les étapes ayant mené au problème. Joindre automatiquement les informations techniques utiles pour reproduire et analyser le bug.
- **Critères d'acceptation :**
  - Le signalement permet de décrire le problème et les étapes pour le reproduire.
  - Les informations de diagnostic utiles (par exemple la page concernée, la date, la version de l'application et les erreurs techniques) sont enregistrées avec le signalement.
  - Les données collectées sont limitées à ce qui est utile et n'incluent pas de données sensibles.
  - L'utilisateur est informé des informations transmises.

## Terminées

### Actualiser la page des clients après l'enregistrement d'un client

- **Statut :** Terminé — confirmé par l'utilisateur le 6 octobre 2026.
- **Priorité initiale :** P1
- **Amélioration réalisée :** La liste des clients est actualisée après un enregistrement réussi.

### Vérifier qu'un praticien existe à l'ouverture du portail

- **Statut :** Terminé
- **Priorité initiale :** P1
- **Amélioration réalisée :** Sans praticien actif, les pages publiques et les API du portail refusent l'accès. Les sessions client déjà ouvertes sont aussi invalidées pour les API du portail.

### Préparer une page de validation beta réservée à la preprod

- **Statut :** Terminé
- **Priorité initiale :** P1
- **Amélioration réalisée :** Les pages de campagne et les API de gestion et de retours sont accessibles uniquement sur la preview Vercel de la branche `preprod`. Les contrôles d'accès `TECH_ADMIN` existants restent appliqués aux API de gestion.

## Modèle pour ajouter une tâche

Copie ce modèle dans la section **À traiter** :

```markdown
### [Titre de l'amélioration]

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** [Ce qui pose problème ou pourrait être amélioré.]
- **Amélioration souhaitée :** [Le résultat attendu.]
- **Critères d'acceptation :**
  - [Comment vérifier que l'amélioration est terminée.]
```
