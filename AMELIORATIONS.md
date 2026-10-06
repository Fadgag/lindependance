# Améliorations à suivre

Ce fichier sert à noter les améliorations à traiter au fur et à mesure qu'elles sont repérées. Ajoute une tâche par amélioration et complète les détails quand ils seront connus.

Les rubriques regroupent les idées qui peuvent être préparées dans un même
chantier. Chaque amélioration conserve toutefois son propre résultat attendu,
son statut et ses critères : un regroupement ne signifie pas que tout doit être
livré en une seule fois.

## Proposition de feuille de route

Les priorités ci-dessous sont une proposition basée sur l'impact utilisateur et l'effort apparent. Les décisions fonctionnelles clarifiées sont résumées plus bas.

| Ordre | Amélioration | Priorité proposée | Effort indicatif | Motif |
| --- | --- | --- | --- | --- |
| 1 | Afficher des erreurs explicites dans les popups | P1 | Petit à moyen | Réduit les impasses utilisateur sans exposer de détails techniques. |
| 2 | Restreindre à preprod le parcours existant de campagnes de test | P1 | Petit à moyen | Les pages et guides existent ; la restriction d'environnement reste à ajouter. |
| 3 | Signaler explicitement l'absence de compte lors d'une réservation | P2 | Moyen | Bloque la réservation si l'adresse n'est pas enregistrée ; les créneaux restent consultables. Le risque d'énumération est accepté. |
| 4 | Autoriser un même numéro de téléphone sur plusieurs fiches client | À classer | À évaluer | Permet notamment de gérer plusieurs fiches d'une même famille. |
| 5 | Confirmer l'adresse e-mail renseignée dans une fiche client | À classer | À évaluer | Permet de vérifier que la personne a accès à l'adresse enregistrée. |
| 6 | Simplifier le vocabulaire et neutraliser les formulations de genre | P2 | Moyen | Amélioration transversale de compréhension. |
| 7 | Permettre à l'utilisateur de signaler un problème ou un bug | P2 | Moyen à grand | Nécessite un stockage et une page de suivi interne sécurisée. |
| 8 | Personnaliser les messages envoyés par e-mail | P3 | Moyen | Permet de modifier l'objet et le texte avec aperçu et variables autorisées. |
| 9 | Proposer un nom de domaine personnalisé | P3 | Grand | Dépend du support et de la configuration DNS/Vercel ; le prix reste à définir. |
| 10 | Personnaliser le logo et le nom du salon | À classer | À évaluer | Permet de cadrer le logo et de régler la police et la taille du nom avec un aperçu. |
| 11 | Figer et valider les scénarios de chaque campagne | À classer | À évaluer | Évite qu'une mise à jour des guides change les tests d'une campagne déjà lancée. |

### Décisions retenues

- **Praticiens :** le portail client ne peut pas être activé sans praticien actif ; expliquer comment en ajouter un.
- **E-mail à la réservation :** si l'adresse n'est pas associée à un compte, l'indiquer explicitement et afficher les coordonnées du salon. Bloquer la réservation, mais laisser les créneaux visibles. Le risque d'énumération d'adresses est accepté ; aucun code n'est envoyé à une adresse non enregistrée.
- **Campagnes beta :** conserver le dashboard `/test-campaigns`, les liens `/retour-test/[jeton]` et les guides existants, mais rendre le dashboard, ses APIs et les soumissions publiques indisponibles hors preprod, notamment en production.
- **Signalement de bug :** tous les utilisateurs connectés (clients et membres du salon) peuvent signaler un problème. Enregistrer les signalements dans l'application ; seuls les administrateurs techniques peuvent les consulter. Joindre seulement la page, la date/heure, la version et une erreur technique expurgée ; ne pas joindre de données client ni de secrets.
- **E-mails personnalisés :** autoriser la modification de l'objet et du texte avec des variables dynamiques autorisées. Prévoir un aperçu dans la configuration ; conserver le gabarit HTML sous le contrôle de l'application.
- **Domaine personnalisé :** le support configure le domaine s'il a les accès, sinon transmet les enregistrements DNS à ajouter. Prix et facturation laissés hors périmètre jusqu'à décision.
- **Vocabulaire :** employer des formulations neutres partout.
- **Scénarios de campagne :** figer les scénarios au lancement. Leur mise à jour après revue des résultats est explicite et ne modifie pas les anciennes campagnes.

## À traiter

### Portail client — personnalisation

Ces deux améliorations concernent la configuration du portail, mais restent des
sous-chantiers distincts : le domaine personnalisé implique aussi le support et
la facturation, tandis que les modèles d'e-mail portent sur la communication.

#### Proposer un nom de domaine personnalisé

- **Statut :** À préciser
- **Priorité proposée :** P3
- **Effort indicatif :** Grand
- **Constat :** Le portail du salon utilise une adresse en `vercel.app`, et sa configuration sur Vercel et dans le DNS peut nécessiter l'intervention du support.
- **Amélioration souhaitée :** Permettre à chaque organisation de demander l'activation de son domaine personnalisé depuis Configuration → Portail. Le support configure le domaine quand il a les accès ou transmet les enregistrements DNS à ajouter. Prévoir une solution générique pour plusieurs salons, sans domaine codé en dur. Le prix et la facturation restent à décider.
- **Critères d'acceptation :**
  - Un membre autorisé peut saisir le domaine souhaité et soumettre une demande depuis Configuration → Portail.
  - La demande contient l'organisation concernée, le domaine demandé et les coordonnées utiles au suivi, sans exposer de secrets.
  - Le support peut suivre la demande et communiquer les enregistrements DNS à ajouter lorsque la gestion DNS n'est pas déléguée.
  - Le domaine est vérifié et associé à une seule organisation avant activation.
  - Le lien actuel avec slug reste utilisable jusqu'à l'activation du domaine personnalisé.
  - Le portail peut être résolu à partir du domaine personnalisé de chaque organisation, sans logique spécifique à un salon.
  - Le prix et les modalités de facturation sont définis avant toute mise en vente de l'option.

#### Personnaliser les messages envoyés par e-mail

- **Statut :** À préciser
- **Priorité proposée :** P3
- **Effort indicatif :** Moyen
- **Constat :** Les e-mails du portail client (code de connexion et confirmation de rendez-vous) utilisent des messages prédéfinis.
- **Amélioration souhaitée :** Permettre à chaque organisation de personnaliser depuis la configuration l'objet et le texte des e-mails envoyés à ses clients, et d'en prévisualiser le rendu sur cette page. Le gabarit HTML reste géré par l'application.
- **Critères d'acceptation :**
  - L'objet et le texte des e-mails de code de connexion et de confirmation de rendez-vous peuvent être personnalisés dans la configuration.
  - Seules les variables dynamiques autorisées (code, prestation, date et horaire du rendez-vous) peuvent être insérées.
  - Un aperçu dans la page de configuration montre le rendu avec des valeurs d'exemple, sans utiliser les données réelles d'un client.
  - Les valeurs par défaut restent disponibles si aucune personnalisation n'est définie.
  - Le gabarit HTML reste contrôlé par l'application.

### Fiches client — gestion et coordonnées

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
- **Amélioration souhaitée :** Permettre à un membre autorisé d'envoyer un e-mail de confirmation depuis la fiche client afin que la personne vérifie qu'elle a accès à cette adresse.
- **Critères d'acceptation :**
  - Un e-mail de confirmation est envoyé à l'adresse renseignée dans la fiche client.
  - La personne peut confirmer qu'elle a accès à cette adresse.
  - L'état de validation de l'adresse est visible depuis la fiche client.
  - Le comportement en cas d'adresse non confirmée ou de lien expiré est défini.
  - Un bouton d'envoi de confirmation est disponible sous l'adresse e-mail de la fiche client.

#### Signaler explicitement l'absence de compte lors d'une réservation

- **Statut :** À préciser
- **Priorité proposée :** P2, avec acceptation du risque d'énumération d'adresses
- **Effort indicatif :** Moyen
- **Constat :** Le portail vérifie l'accès à l'adresse e-mail par code, mais l'évolution souhaitée est d'indiquer quand aucune fiche client ne correspond à l'adresse saisie lors d'une réservation.
- **Amélioration souhaitée :** Si l'adresse saisie n'est associée à aucun compte, l'indiquer explicitement et afficher les coordonnées du salon. Ce comportement révèle si une adresse est associée à un compte ; ce risque est accepté.
- **Critères d'acceptation :**
  - La présence de l'adresse e-mail dans la base est vérifiée lors de la prise de rendez-vous.
  - Si l'adresse n'est pas associée à un compte, le message le précise et présente les coordonnées du salon.
  - La réservation ne peut pas être envoyée tant que l'e-mail n'est pas associé à un compte.
  - Les créneaux disponibles restent consultables même si la réservation est bloquée.
  - Aucun code de confirmation n'est envoyé à une adresse qui n'est pas enregistrée.

### Expérience utilisateur — messages et formulations

#### Afficher des erreurs explicites dans les popups

- **Statut :** À préciser
- **Priorité proposée :** P1
- **Effort indicatif :** Petit à moyen
- **Constat :** Certaines erreurs affichent un message générique comme `internalError`.
- **Amélioration souhaitée :** Afficher dans une popup un message clair qui explique le problème et, si possible, indique quoi faire ensuite.
- **Critères d'acceptation :**
  - Le message est compréhensible pour la personne qui utilise l'application.
  - Le message aide à comprendre la prochaine étape ou à réessayer.
  - Les détails techniques ou sensibles ne sont pas exposés.

#### Simplifier le vocabulaire et neutraliser les formulations de genre

- **Statut :** À préciser
- **Priorité proposée :** P2
- **Effort indicatif :** Moyen
- **Constat :** Certains termes de l'interface sont jargonneux et les formulations sont au féminin partout.
- **Amélioration souhaitée :** Employer des termes accessibles et des formulations neutres partout.
- **Critères d'acceptation :**
  - Le vocabulaire de l'interface est compréhensible sans jargon inutile.
  - Les formulations ne supposent pas le genre de la personne qui utilise l'application.

Ces deux améliorations peuvent être traitées ensemble dans une passe de clarté
de l'interface ; leurs résultats restent vérifiables séparément.

### Qualité terrain — retours et validation

#### Permettre à l'utilisateur de signaler un problème ou un bug

- **Statut :** À préciser
- **Priorité proposée :** P2
- **Effort indicatif :** Moyen à grand
- **Constat :** L'utilisateur ne dispose pas d'un endroit dédié pour signaler un problème rencontré dans l'application.
- **Amélioration souhaitée :** Ajouter un formulaire accessible à tout utilisateur connecté, client ou membre du salon, qui demande ce qui s'est passé et les étapes ayant mené au problème. Enregistrer les signalements dans l'application et fournir une page de suivi réservée aux administrateurs techniques.
- **Critères d'acceptation :**
  - Le signalement permet de décrire le problème et les étapes pour le reproduire.
  - La page concernée, la date/heure, la version de l'application et une erreur technique expurgée sont enregistrées avec le signalement.
  - Seuls les administrateurs techniques peuvent consulter la page de suivi.
  - Les signalements restent associés à leur organisation et ne sont pas visibles par les autres salons.
  - Aucune donnée client ni aucun secret n'est joint automatiquement.
  - L'utilisateur est informé des informations transmises.

#### Restreindre à preprod le parcours existant de campagnes de test

- **Statut :** Parcours existant ; restriction d'environnement à faire
- **Priorité proposée :** P1
- **Effort indicatif :** Petit à moyen
- **Constat :** Le dashboard `/test-campaigns`, les pages publiques `/retour-test/[jeton]` et les guides de recette existent déjà, mais le parcours n'est pas réservé à preprod.
- **Amélioration souhaitée :** Conserver le parcours actuel et rendre son dashboard, ses APIs de gestion et de feedback, ainsi que les liens publics de campagne, indisponibles hors preprod, notamment en production.
- **Critères d'acceptation :**
  - Le dashboard des campagnes et ses APIs ne sont utilisables qu'en preprod par les administrateurs techniques autorisés.
  - Les pages et soumissions publiques de feedback de campagne sont utilisables en preprod avec un jeton valide.
  - En production, ni les pages ni les APIs de gestion ou de soumission ne permettent d'accéder au parcours.
  - Les scénarios restent ceux des guides de recette existants.

#### Figer et valider les scénarios de chaque campagne

- **Statut :** À préciser
- **Priorité :** À définir
- **Effort :** À évaluer
- **Constat :** Les scénarios sont chargés depuis les guides de recette à chaque consultation de la campagne. Une mise à jour d'un guide peut donc modifier les scénarios d'une campagne déjà en cours.
- **Amélioration souhaitée :** Enregistrer avec chaque campagne la version des guides et un instantané des scénarios au lancement. À la clôture, permettre à un administrateur technique de valider les résultats et de relever les corrections souhaitées. Les guides sont modifiés explicitement après cette revue ; les changements s'appliquent aux campagnes suivantes, sans modifier les campagnes ou résultats existants.
- **Critères d'acceptation :**
  - La campagne conserve la version et les scénarios utilisés lors de son lancement.
  - Une modification ultérieure des guides ne change pas la checklist d'une campagne active ou clôturée.
  - Un administrateur technique peut examiner les résultats et valider la campagne avec un résumé de son état.
  - Les retours peuvent conduire à proposer une correction des guides, mais ne modifient pas automatiquement les scénarios.
  - Une nouvelle campagne utilise les versions de scénarios mises à jour.

### Identité et présentation du salon

#### Personnaliser le logo et le nom du salon

- **Statut :** À préciser
- **Priorité :** À définir
- **Effort :** À évaluer
- **Constat :** Le logo peut nécessiter un cadrage pour n'afficher que la partie souhaitée de l'image dans la zone prévue. Le nom du salon doit aussi pouvoir être adapté à la présentation souhaitée.
- **Amélioration souhaitée :** Lors de la sélection du logo, afficher un aperçu avec un cadre de cadrage correspondant à la zone du logo. Permettre de déplacer et de zoomer l'image dans cet aperçu. Permettre également de choisir la police et la taille d'affichage du nom du salon, avec un aperçu du résultat.
- **Critères d'acceptation :**
  - Le cadre indique clairement quelle partie de l'image sera utilisée dans la zone du logo.
  - La personne peut déplacer et zoomer l'image dans l'aperçu pour ajuster le cadrage.
  - La personne peut choisir la police et la taille du nom du salon.
  - L'aperçu montre le cadrage du logo et le nom du salon avec la police et la taille choisies.
  - Le logo enregistré et affiché correspond au cadrage choisi.
  - Le nom du salon est affiché avec la police et la taille choisies.

## Réalisées

### Portail client — accès, réservation et coordonnées

#### Rendre le portail indisponible sans praticien actif

- **Statut :** Réalisée
- **Constat :** Le portail pouvait être ouvert alors qu'aucun praticien actif n'était configuré.
- **Résultat :** L'activation requiert un praticien actif ; la désactivation ou l'archivage du dernier praticien désactive le portail et avertit les administrateurs. La réactivation d'un praticien ne réactive pas automatiquement le portail.

#### Vérifier l'accès à l'adresse e-mail lors de la réservation

- **Statut :** Réalisée
- **Constat :** Le portail vérifiait déjà l'accès à l'adresse e-mail avec un code, mais les coordonnées publiques du salon n'étaient pas configurables ni affichées.
- **Résultat :** Le téléphone et l'e-mail publics se configurent depuis les réglages du portail. Une aide neutre et les coordonnées disponibles sont affichées sans révéler si une fiche correspond à l'adresse saisie.

### Afficher l'identité du salon sur la page de réservation

- **Statut :** Réalisée
- **Constat :** La page de réservation n'affichait ni le logo ni le nom du salon.
- **Résultat :** Le nom du salon et son logo configuré sont maintenant affichés sur la page de réservation. Le cadrage du logo et la personnalisation typographique du nom restent à réaliser.

### Fiches client — actualisation de la liste

#### Actualiser la liste des clients après l'enregistrement

- **Statut :** Terminée — vérifiée le 2026-10-06
- **Résultat :** La liste est actualisée après la création réussie d'un client, sans effacer la recherche en cours.

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
