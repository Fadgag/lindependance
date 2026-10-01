# Améliorations à suivre

Ce fichier sert à noter les améliorations à traiter au fur et à mesure qu'elles sont repérées. Ajoute une tâche par amélioration et complète les détails quand ils seront connus.

## À traiter

### Afficher des erreurs explicites dans les popups

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Certaines erreurs affichent un message générique comme `internalError`.
- **Amélioration souhaitée :** Afficher dans une popup un message clair qui explique le problème et, si possible, indique quoi faire ensuite.
- **Critères d'acceptation :**
  - Le message est compréhensible pour la personne qui utilise l'application.
  - Le message aide à comprendre la prochaine étape ou à réessayer.
  - Les détails techniques ou sensibles ne sont pas exposés.

### Vérifier qu'un praticien existe à l'ouverture du portail

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Le portail peut être ouvert sans vérifier qu'au moins un praticien est configuré.
- **Amélioration souhaitée :** Contrôler la présence d'un praticien à l'ouverture du portail et prévenir clairement l'utilisateur si aucun n'existe.
- **Critères d'acceptation :**
  - Le contrôle est effectué lors de l'ouverture du portail.
  - L'utilisateur est informé si aucun praticien n'est configuré.
  - Le comportement après cette alerte (bloquer l'accès ou autoriser la poursuite) reste à préciser.

### Actualiser la page des clients après l'enregistrement d'un client

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Après l'enregistrement d'un client, la page des clients ne se recharge pas et n'affiche pas immédiatement les données à jour.
- **Amélioration souhaitée :** Actualiser la liste des clients après un enregistrement réussi.
- **Critères d'acceptation :**
  - Le nouveau client apparaît dans la liste sans rechargement manuel de la page.
  - Les autres comportements de la page des clients sont conservés.

### Simplifier le vocabulaire et revoir les formulations au féminin

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Certains termes de l'interface sont jargonneux et les formulations sont au féminin partout.
- **Amélioration souhaitée :** Employer des termes accessibles et revoir les accords de genre selon les personnes et le contexte concernés.
- **Critères d'acceptation :**
  - Le vocabulaire de l'interface est compréhensible sans jargon inutile.
  - Les accords de genre sont cohérents avec les personnes ou les rôles désignés.

### Vérifier l'adresse e-mail lors de la prise de rendez-vous client

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Un client peut tenter de prendre un rendez-vous sans que son adresse e-mail existe dans la base.
- **Amélioration souhaitée :** Vérifier l'adresse e-mail saisie. Si elle ne correspond à aucun client, afficher un message invitant la personne à contacter le salon et présenter la fiche contact du salon.
- **Critères d'acceptation :**
  - La présence de l'adresse e-mail dans la base est vérifiée lors de la prise de rendez-vous.
  - Si l'adresse n'est pas trouvée, un message clair invite le client à contacter le salon.
  - La fiche contact du salon (coordonnées) est affichée dans ce cas.
  - Le comportement de la prise de rendez-vous après l'affichage de ce message reste à préciser.

### Proposer un nom de domaine personnalisé en option payante

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Le portail du salon utilise une adresse en `vercel.app`.
- **Amélioration souhaitée :** Proposer une option payante permettant d'utiliser un nom de domaine personnalisé pour le salon à la place de l'adresse en `vercel.app`.
- **Critères d'acceptation :**
  - Le portail du salon peut être consulté via son nom de domaine personnalisé.
  - Les étapes de configuration DNS et d'activation du domaine sont définies.
  - Le prix et les modalités de facturation de l'option sont définis.

### Permettre à l'utilisateur de signaler un problème ou un bug

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** L'utilisateur ne dispose pas d'un endroit dédié pour signaler un problème rencontré dans l'application.
- **Amélioration souhaitée :** Ajouter un formulaire de signalement qui demande ce qui s'est passé et les étapes ayant mené au problème. Joindre automatiquement les informations techniques utiles pour reproduire et analyser le bug.
- **Critères d'acceptation :**
  - Le signalement permet de décrire le problème et les étapes pour le reproduire.
  - Les informations de diagnostic utiles (par exemple la page concernée, la date, la version de l'application et les erreurs techniques) sont enregistrées avec le signalement.
  - Les données collectées sont limitées à ce qui est utile et n'incluent pas de données sensibles.
  - L'utilisateur est informé des informations transmises.

### Préparer une page de validation beta réservée à la preprod

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Les beta-testeurs n'ont pas de page dédiée pour valider les fonctionnalités en preprod.
- **Amélioration souhaitée :** Créer une page de test accessible uniquement en preprod, permettant aux beta-testeurs de valider l'application.
- **Critères d'acceptation :**
  - La page est accessible aux beta-testeurs sur l'environnement preprod.
  - La page et ses fonctionnalités ne sont pas accessibles en production.
  - Le contenu et les scénarios à valider par les beta-testeurs sont définis.

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
