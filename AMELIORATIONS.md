# Améliorations à suivre

Ce fichier sert à noter les améliorations à traiter au fur et à mesure qu'elles sont repérées. Ajoute une tâche par amélioration et complète les détails quand ils seront connus.

Les rubriques regroupent les idées qui peuvent être préparées dans un même
chantier. Chaque amélioration conserve toutefois son propre résultat attendu,
son statut et ses critères : un regroupement ne signifie pas que tout doit être
livré en une seule fois.

## À traiter

### Vérifier qu'un praticien existe à l'ouverture du portail

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Les e-mails du portail client (code de connexion et confirmation de rendez-vous) utilisent des messages prédéfinis.
- **Amélioration souhaitée :** Permettre à chaque organisation de personnaliser depuis la configuration le contenu des e-mails envoyés à ses clients.
- **Critères d'acceptation :**
    - Le contenu des e-mails de code de connexion et de confirmation de rendez-vous peut être personnalisé dans la configuration.
    - Les valeurs par défaut restent disponibles si aucun texte personnalisé n'est défini.
    - Les informations dynamiques nécessaires (code, prestation, date et horaire du rendez-vous) restent correctement insérées dans le message.

### Fiches client — gestion et coordonnées

#### Actualiser la page des clients après l'enregistrement d'un client

- **Statut :** Réalisée
- **Priorité :** À définir
- **Constat :** Après l'enregistrement d'un client, la page des clients ne se recharge pas et n'affiche pas immédiatement les données à jour.
- **Amélioration souhaitée :** Actualiser la liste des clients après un enregistrement réussi.
- **Critères d'acceptation :**
    - Le nouveau client apparaît dans la liste sans rechargement manuel de la page.
    - Les autres comportements de la page des clients sont conservés.
- **Résultat :** La liste est relue après la création réussie d'un client, sans effacer la recherche en cours.

#### Autoriser un même numéro de téléphone sur plusieurs fiches client

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Un même numéro de téléphone peut être utilisé par un parent pour plusieurs enfants, mais il peut être refusé ou empêcher de distinguer leurs fiches client.
- **Amélioration souhaitée :** Permettre d'associer le même numéro de téléphone à plusieurs fiches client, notamment pour gérer les fiches d'enfants d'une même famille.
- **Critères d'acceptation :**
    - Plusieurs fiches client peuvent enregistrer le même numéro de téléphone.
    - Chaque fiche reste identifiable séparément par son nom et ses autres informations.
    - Les parcours qui utilisent le numéro de téléphone continuent de fonctionner sans sélectionner ou modifier la mauvaise fiche.

#### Confirmer l'adresse e-mail renseignée dans une fiche client

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Une adresse e-mail peut être renseignée dans une fiche client sans que sa validité soit vérifiée.
- **Amélioration souhaitée :** Envoyer un e-mail de confirmation lorsque l'admin clic sur le bouton à "envoyer email de confirmation" en dessous de l'adresse e-mail d'un client afin que la personne puisse valider qu'elle y a accès.
- **Critères d'acceptation :**
    - Un e-mail de confirmation est envoyé à l'adresse renseignée dans la fiche client.
    - La personne peut confirmer qu'elle a accès à cette adresse.
    - L'état de validation de l'adresse est visible depuis la fiche client.
    - Le comportement en cas d'adresse non confirmée ou de lien expiré reste à préciser.
    - Un bouton"envoyer emal de confirmation" en dessous de l'adresse email dans la fiche client.

Cette validation est liée aux coordonnées des fiches client et au parcours de
vérification d'e-mail du portail, mais elle reste distincte : le portail vérifie
actuellement l'accès à l'e-mail au moment de la connexion.

### Expérience utilisateur — messages et formulations

#### Afficher des erreurs explicites dans les popups

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Certaines erreurs affichent un message générique comme `internalError`.
- **Amélioration souhaitée :** Afficher dans une popup un message clair qui explique le problème et, si possible, indique quoi faire ensuite.
- **Critères d'acceptation :**
    - Le message est compréhensible pour la personne qui utilise l'application.
    - Le message aide à comprendre la prochaine étape ou à réessayer.
    - Les détails techniques ou sensibles ne sont pas exposés.

#### Simplifier le vocabulaire et revoir les formulations au féminin

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Certains termes de l'interface sont jargonneux et les formulations sont au féminin partout.
- **Amélioration souhaitée :** Employer des termes accessibles et revoir les accords de genre selon les personnes et le contexte concernés.
- **Critères d'acceptation :**
    - Le vocabulaire de l'interface est compréhensible sans jargon inutile.
    - Les accords de genre sont cohérents avec les personnes ou les rôles désignés.

Ces deux améliorations peuvent être traitées ensemble dans une passe de clarté
de l'interface ; les messages d'erreur et les formulations restent vérifiables
séparément.

### Qualité terrain — retours et validation

#### Permettre à l'utilisateur de signaler un problème ou un bug

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** L'utilisateur ne dispose pas d'un endroit dédié pour signaler un problème rencontré dans l'application.
- **Amélioration souhaitée :** Ajouter un formulaire de signalement qui demande ce qui s'est passé et les étapes ayant mené au problème. Joindre automatiquement les informations techniques utiles pour reproduire et analyser le bug.
- **Critères d'acceptation :**
    - Le signalement permet de décrire le problème et les étapes pour le reproduire.
    - Les informations de diagnostic utiles (par exemple la page concernée, la date, la version de l'application et les erreurs techniques) sont enregistrées avec le signalement.
    - Les données collectées sont limitées à ce qui est utile et n'incluent pas de données sensibles.
    - L'utilisateur est informé des informations transmises.

#### Préparer une page de validation beta réservée à la preprod

- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** Les beta-testeurs n'ont pas de page dédiée pour valider les fonctionnalités en preprod.
- **Amélioration souhaitée :** Créer une page de test accessible uniquement en preprod, permettant aux beta-testeurs de valider l'application.
- **Critères d'acceptation :**
    - La page est accessible aux beta-testeurs sur l'environnement preprod.
    - La page et ses fonctionnalités ne sont pas accessibles en production.
    - Le contenu et les scénarios à valider par les beta-testeurs sont définis.

## Réalisées

### Portail client — accès, réservation et coordonnées

#### Rendre le portail indisponible sans praticien actif

- **Statut :** Réalisée
- **Priorité :** À définir
- **Constat :** Le portail pouvait être ouvert alors qu'aucun praticien actif n'était configuré.
- **Amélioration souhaitée :** Ne pas rendre le portail client disponible tant que l'organisation n'a pas au moins un praticien actif.
- **Résultat :** L'activation requiert un praticien actif ; la désactivation ou l'archivage du dernier praticien désactive le portail et avertit les administrateurs. La réactivation d'un praticien ne réactive pas automatiquement le portail.

#### Vérifier l'adresse e-mail lors de la prise de rendez-vous client

- **Statut :** Réalisée
- **Priorité :** À définir
- **Constat :** Le portail vérifiait déjà l'accès à l'adresse e-mail avec un code, mais les coordonnées publiques du salon n'étaient pas configurables ni affichées.
- **Amélioration souhaitée :** Conserver la vérification par code et aider le client à contacter le salon s'il ne reçoit pas son code, sans révéler si une fiche correspond à l'adresse saisie.
- **Résultat :** Le téléphone et l'e-mail publics se configurent depuis les réglages du portail. Une aide neutre et les coordonnées disponibles sont affichées sans révéler si une fiche correspond à l'adresse saisie.

### Afficher l'identité du salon sur la page de réservation

- **Statut :** Réalisée
- **Constat :** La page de réservation n'affichait ni le logo ni le nom du salon.
- **Résultat :** Le nom du salon et son logo configuré sont maintenant affichés sur la page de réservation.

## Traités

### Afficher des erreurs explicites dans les popups

- **Parcours couverts :** Rendez-vous (création, modification, déplacement, suppression), encaissement, indisponibilités et paramètres d’horaires et d’objectif financier.
- **Résultat :** Les erreurs réseau et réponses d’échec indiquent une action utile ; les détails techniques du serveur ne sont pas affichés. Les erreurs de formulaire conservent leurs messages de validation.

## Modèle pour ajouter une tâche

Copie ce modèle dans la section **À traiter** :

```markdown
### [Titre de l'amélioration]

- **Regroupement :** [Sujet ou chantier commun, si pertinent.]
- **Statut :** À préciser
- **Priorité :** À définir
- **Constat :** [Ce qui pose problème ou pourrait être amélioré.]
- **Amélioration souhaitée :** [Le résultat attendu.]
- **Critères d'acceptation :**
  - [Comment vérifier que l'amélioration est terminée.]
```
