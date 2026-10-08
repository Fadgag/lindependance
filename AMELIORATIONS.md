# Améliorations à suivre

Ce fichier suit les améliorations à traiter au fur et à mesure qu'elles sont repérées. Les statuts et priorités ci-dessous sont une proposition de tri fondée sur l'état du dépôt observé le 8 octobre 2026 ; ils ne remplacent pas les décisions produit.

### Légende de priorisation

- **P1 — prioritaire :** gêne ou bloque un parcours important, ou nécessite de vérifier une frontière d'environnement.
- **P2 — important :** amélioration utile, mais un parcours principal reste utilisable.
- **P3 — à cadrer :** dépend d'une décision produit, commerciale ou de support.

Les priorités proposées indiquent l'ordre de traitement, pas la taille des travaux.

Les rubriques regroupent les idées qui peuvent être préparées dans un même
chantier. Chaque amélioration conserve toutefois son propre résultat attendu,
son statut et ses critères : un regroupement ne signifie pas que tout doit être
livré en une seule fois.

## À traiter

### Vérifications manuelles bêta restantes

Les développements concernés sont implémentés. Il reste à effectuer les
vérifications manuelles suivantes dans les guides de recette :

- Vérifier la personnalisation de l'identité visuelle du portail côté staff et
  son affichage côté client.
- Après déploiement de la correction du service worker, ouvrir puis recharger le
  portail client et vérifier que la réservation reste accessible.
- Vérifier les e-mails personnalisés avec `CUS-05`, `CUS-10` et `ADM-13`.
- Appliquer la migration des signalements à la base bêta, puis vérifier les
  parcours client et staff avec `CUS-17` et `ADM-12`.

Les sujets P3 et ceux à cadrer restent au backlog selon les priorités indiquées ci-dessous.

### Simplifier le vocabulaire et revoir les formulations au féminin

- **Type :** Amélioration
- **Statut :** Réalisée — passe de clarté effectuée sur les parcours client et personnel ; tests UI ciblés réussis le 6 octobre 2026.
- **Priorité proposée :** P2
- **Constat :** Certains termes de l'interface sont jargonneux et les formulations sont au féminin partout.
- **Amélioration souhaitée :** Employer des termes accessibles et revoir les accords de genre selon les personnes et le contexte concernés.
- **Critères d'acceptation :**
  - Le vocabulaire de l'interface est compréhensible sans jargon inutile.
  - Les accords de genre sont cohérents avec les personnes ou les rôles désignés.

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

### Portail client — identité visuelle

#### Corriger l'erreur de lecture de réponse du service worker

- **Type :** Bug
- **Statut :** Clonage de réponse corrigé et fusionné ; accès public au manifest et au service worker corrigé localement, vérification en preprod requise.
- **Priorité proposée :** P1
- **Comportement observé :** À l'ouverture du portail en preprod, la console signalait que `clone()` était appelé sur une réponse déjà utilisée. Après application de la migration de personnalisation du portail, la page répond et affiche « Chargement du portail », mais le navigateur reçoit un `403` pour un chunk JavaScript. Les demandes de `/manifest.json` et `/sw.js` sont redirigées vers `/auth/signin` par le proxy. Lors du contrôle réseau, le `403` du chunk renvoyait une page de blocage Zscaler ; son origine doit être confirmée depuis le réseau du testeur.
- **Comportement attendu :** Le service worker met en cache les réponses réseau sans cloner leur corps après consommation ; le manifest et le service worker sont accessibles sans authentification ; les chunks JavaScript sont servis par l'application et le portail termine son chargement.
- **Impact :** Le chargement ou l'actualisation du portail client peut échouer.
- **Critères d'acceptation :**
  - L'ouverture et l'actualisation du portail ne produisent plus d'erreur `Response body is already used`.
  - `/manifest.json` renvoie un document JSON valide et `/sw.js` le script du service worker, sans redirection vers la connexion staff.
  - Le navigateur charge les chunks JavaScript et termine l'affichage de la réservation.
  - Si un `403` persiste, sa requête et sa cause sont identifiées séparément.

#### Personnaliser l'apparence du nom et du logo du salon

- **Type :** Amélioration
- **Statut :** Réalisée — réglage commun de taille vérifié par tests automatisés ; la recette manuelle bêta reste à effectuer.
- **Priorité :** À définir
- **Constat / comportement observé :** L'identité du salon apparaît sur le portail, mais les tailles du logo se réglaient séparément dans l'espace de gestion et sur le portail ; les trois choix de l'espace de gestion limitaient la personnalisation.
- **Comportement attendu / résultat souhaité :** Permettre à chaque organisation de personnaliser l'identité affichée sur le portail avec aperçu avant enregistrement, et de régler la taille du logo une seule fois pour l'espace de gestion et le portail.
- **Impact :** Les organisations disposent d'un seul réglage cohérent de taille du logo, adapté aux limites d'affichage de chaque écran.
- **Critères d'acceptation :**
  - Un administrateur peut choisir une police intégrée, une taille de nom de 14 à 24 px, une couleur contrastée, une graisse et un alignement.
  - Le logo PNG, JPEG ou WebP de 10 Mo maximum peut être déplacé et agrandi dans un recadrage carré ; seul le résultat optimisé est enregistré.
  - Un seul curseur de 24 à 160 px règle la taille du logo dans l'espace de gestion et le portail ; l'espace de gestion est plafonné à 64 px dans la barre latérale et 48 px sur mobile, le portail à 128 px sur mobile et 160 px sur grand écran.
  - L'aperçu bascule entre mobile et grand écran, reflète les changements avant sauvegarde et le bouton de réinitialisation ne persiste rien sans action d'enregistrement.
  - Les réglages sont isolés par organisation et appliqués de façon cohérente aux pages de réservation et « Mes rendez-vous ».
  - Les guides de recette permettent de vérifier la configuration staff et son affichage côté client.

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

### Qualité terrain — retours et validation

#### Permettre à l'utilisateur de signaler un problème ou un bug

- **Type :** Amélioration
- **Statut :** Implémentée — la migration doit être appliquée et le parcours vérifié en bêta.
- **Priorité proposée :** P2
- **Constat :** L'utilisateur ne dispose pas d'un endroit dédié pour signaler un problème rencontré dans l'application.
- **Amélioration souhaitée :** Ajouter un formulaire de signalement qui demande ce qui s'est passé et les étapes ayant mené au problème. Joindre automatiquement les informations techniques utiles pour reproduire et analyser le bug.
- **Critères d'acceptation :**
    - Le signalement permet de décrire le problème et les étapes pour le reproduire.
    - Les informations de diagnostic utiles (par exemple la page concernée, la date, la version de l'application et les erreurs techniques) sont enregistrées avec le signalement.
    - Les données collectées sont limitées à ce qui est utile et n'incluent pas de données sensibles.
    - L'utilisateur est informé des informations transmises.
    - Le personnel et les clients connectés peuvent envoyer un signalement ; seuls les administrateurs techniques peuvent le consulter et le traiter.
    - Les signalements résolus sont supprimés après 90 jours.
- **Mise à jour :** Le formulaire, les diagnostics expurgés, les contrôles d'accès `TECH_ADMIN`, le tableau de suivi et la migration additive sont implémentés. Les scénarios `CUS-17` et `ADM-12` couvrent la recette manuelle ; la migration n'a pas été appliquée à une base.

#### Vérifier les e-mails personnalisés dans les campagnes de recette

- **Type :** Amélioration
- **Statut :** Guides mis à jour — exécution manuelle en campagne bêta à planifier.
- **Priorité proposée :** P2
- **Constat :** Les scénarios client `CUS-05` et `CUS-10` vérifient l'envoi du code et de la confirmation, mais pas les modèles personnalisés. Le guide staff ne vérifie pas encore leur configuration.
- **Amélioration souhaitée :** Compléter les scénarios existants côté client et ajouter un contrôle côté staff pour la configuration et la réinitialisation des messages. Garder les profils `USER` (client) et `ADMIN` (staff/admin) de la campagne ; une catégorie distincte « STAFF » n'est pas nécessaire si les cas restent dans le groupe d'administration du personnel.
- **Critères d'acceptation :**
    - Le staff peut enregistrer puis rétablir les deux messages, et l'interface bloque les variables obligatoires manquantes.
    - Le client reçoit le code et la confirmation personnalisés de la bonne organisation, avec les bonnes informations de rendez-vous.
    - Le retour au modèle par défaut est vérifié pour les deux e-mails ; la confirmation conserve sa pièce jointe calendrier.
    - Les scénarios sont inclus dans les groupes de campagne correspondant aux profils client et staff/admin.
- **Mise à jour :** `CUS-05`, `CUS-10` et `ADM-13` couvrent maintenant ces vérifications ; `ADM-13` est inclus dans le groupe « Administration staff ». Les résultats réels restent à renseigner pendant la campagne bêta.

## Réalisées

### Personnaliser les messages envoyés par e-mail

- **Type :** Amélioration
- **Statut :** Réalisée — critères vérifiés le 6 octobre 2026.
- **Priorité initiale :** P2
- **Résultat :** Chaque organisation peut personnaliser en texte brut le corps des e-mails de code de connexion et de confirmation de rendez-vous. Les variables obligatoires sont validées et les valeurs par défaut peuvent être rétablies. Le contenu est échappé avant rendu HTML ; les sujets et la pièce jointe calendrier restent gérés par le système.

### Fiches client — gestion et coordonnées

#### Actualiser la page des clients après l'enregistrement d'un client

- **Statut :** Réalisée — confirmé par l'utilisateur le 6 octobre 2026.
- **Priorité initiale :** P1
- **Résultat :** La liste est relue après la création réussie d'un client, sans effacer la recherche en cours.

### Portail client — accès, réservation et coordonnées

#### Rendre le portail indisponible sans praticien actif

- **Statut :** Réalisée
- **Priorité initiale :** P1
- **Constat :** Le portail pouvait être ouvert alors qu'aucun praticien actif n'était configuré.
- **Amélioration souhaitée :** Ne pas rendre le portail client disponible tant que l'organisation n'a pas au moins un praticien actif.
- **Résultat :** L'activation requiert un praticien actif et un moyen de contact public. La désactivation ou l'archivage du dernier praticien désactive le portail et avertit les administrateurs. Les pages et API du portail refusent l'accès sans praticien actif ; la réactivation d'un praticien ne réactive pas automatiquement le portail.

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

### Préparer une page de validation beta réservée à la preprod

- **Statut :** Réalisée
- **Priorité initiale :** P1
- **Résultat :** Les pages de campagne et les API de gestion et de retours sont accessibles uniquement sur la preview Vercel de la branche `preprod`. Les contrôles d'accès `TECH_ADMIN` existants restent appliqués aux API de gestion.

## Traités

### Afficher des erreurs explicites dans les popups

- **Parcours couverts :** Rendez-vous (création, modification, déplacement, suppression), encaissement, indisponibilités et paramètres d’horaires et d’objectif financier.
- **Résultat :** Les erreurs réseau et réponses d’échec indiquent une action utile ; les détails techniques du serveur ne sont pas affichés. Les erreurs de formulaire conservent leurs messages de validation.

## Modèle pour ajouter une tâche

Copie ce modèle dans la section **À traiter** pour une amélioration ou un bug :

```markdown
### [Amélioration ou bug] — [Titre]

- **Regroupement :** [Sujet ou chantier commun, si pertinent.]
- **Type :** [Amélioration | Bug]
- **Statut :** À préciser
- **Priorité :** À définir
- **Constat / comportement observé :** [Ce qui pose problème ou pourrait être amélioré.]
- **Comportement attendu / résultat souhaité :** [Résultat attendu.]
- **Étapes de reproduction :** [Pour un bug, étapes connues ; sinon « Sans objet ».]
- **Impact :** [Personnes ou parcours concernés et conséquence.]
- **Critères d'acceptation :**
  - [Comment vérifier que l'amélioration est terminée.]
```
