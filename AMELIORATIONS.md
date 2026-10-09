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

### Constats de l'audit global du 9 octobre 2026

#### Retirer les identifiants prévisibles du seed administrateur

- **Type :** Bug
- **Statut :** Réalisé — seed admin facultatif limité aux bases locales, secret d'environnement requis et compte existant inchangé.
- **Priorité proposée :** P1
- **Constat :** Le seed définit un mot de passe administrateur constant et réapplique ce mot de passe, le rôle `ADMIN` et l'organisation à chaque exécution pour le même compte.
- **Comportement attendu :** Un seed ne doit ni créer ni réinitialiser un compte administrateur avec un secret connu ou partagé.
- **Impact :** Si le seed est exécuté sur une base accessible à l'application, le compte administrateur concerné peut être pris en charge avec les identifiants présents dans le dépôt.
- **Critères d'acceptation :**
  - Aucun mot de passe administrateur réutilisable n'est codé dans le seed.
  - Le seed n'attribue ni ne réinitialise silencieusement les identifiants d'un compte administrateur existant.
  - L'initialisation d'un compte privilégié utilise un secret propre à l'environnement et vérifie sa cible avant toute écriture.
- **Résultat :** Le seed n'accepte l'initialisation admin qu'avec `SEED_ADMIN_*`, refuse les bases distantes et `NODE_ENV=production`, et ne fait qu'une création. Le contrôle de refus d'une base distante a été validé le 9 octobre 2026.

#### Rendre l'encaissement idempotent et vérifier ses montants côté serveur

- **Type :** Bug
- **Statut :** Réalisé — total recalculé côté serveur, suppléments libres réservés aux comptes `ADMIN` et répétitions bloquées.
- **Priorité proposée :** P1
- **Constat :** La route d'encaissement accepte les valeurs de prix fournies par le navigateur et ne vérifie pas que le rendez-vous n'est pas déjà payé avant de décrémenter le stock et de le marquer payé.
- **Comportement observé :** Une requête répétée pour un rendez-vous déjà payé peut décrémenter une nouvelle fois le stock ; un client modifié peut aussi enregistrer des montants qui ne correspondent pas aux tarifs enregistrés.
- **Comportement attendu :** Les montants enregistrés sont validés ou calculés à partir des données persistées, et une seule transition vers l'état payé peut décrémenter le stock.
- **Impact :** Les quantités en stock et les montants de chiffre d'affaires peuvent devenir inexacts.
- **Critères d'acceptation :**
  - Une seconde requête d'encaissement sur un rendez-vous déjà payé échoue sans modifier le stock ni les données financières.
  - Les prix et taxes des produits sont récupérés côté serveur ; les montants reçus du navigateur ne sont pas considérés comme source de vérité.
  - Des tests couvrent la répétition concurrente ou séquentielle d'une requête et la falsification des montants.
- **Résultat :** Le serveur recalcule le prix du service et des produits depuis la base, refuse les champs financiers envoyés par le navigateur, réserve les suppléments libres aux comptes `ADMIN` et empêche atomiquement un second encaissement. La suite Vitest complète (531 tests réussis, 1 ignoré), le type-check et le lint ciblé ont réussi le 9 octobre 2026.

#### Limiter les tentatives de connexion et de réinitialisation du mot de passe

- **Type :** Amélioration
- **Statut :** À traiter — suivi opérationnel dans le [GitHub Project](https://github.com/users/Fadgag/projects/1) et l'[Issue associée](https://github.com/Fadgag/lindependance/issues/67).
- **Priorité proposée :** P2
- **Constat :** Les points d'entrée publics de connexion par mot de passe et de demande de réinitialisation n'appliquent pas de limitation de tentatives dans le code applicatif.
- **Comportement attendu :** Les tentatives répétées sont ralenties ou bloquées sans révéler l'existence d'un compte.
- **Impact :** La connexion est exposée aux essais automatisés ; les demandes de réinitialisation peuvent être utilisées pour solliciter des e-mails répétés et invalider les liens précédemment envoyés.
- **Critères d'acceptation :**
  - Les tentatives de connexion et de réinitialisation sont limitées selon une politique documentée.
  - Les réponses publiques ne révèlent pas si une adresse possède un compte.
  - Les demandes répétées ne peuvent pas envoyer indéfiniment des e-mails ni invalider le lien de réinitialisation sans contrôle.

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
Les vérifications bêta restantes sont suivies dans l'[Issue de campagne](https://github.com/Fadgag/lindependance/issues/66).

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
- **Suivi opérationnel :** [GitHub Project](https://github.com/users/Fadgag/projects/1) · [Issue de cadrage](https://github.com/Fadgag/lindependance/issues/63).
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

- **Type :** Amélioration
- **Statut :** Implémentée — création et sélection validées par tests automatisés le 8 octobre 2026 ; recette manuelle en bêta à effectuer.
- **Priorité :** À définir
- **Constat :** Un même numéro de téléphone peut être utilisé par un parent pour plusieurs enfants, mais il peut être refusé ou empêcher de distinguer leurs fiches client.
- **Amélioration souhaitée :** Permettre d'associer le même numéro à plusieurs fiches dans une organisation. Le téléphone est une information de contact destinée au personnel, notamment pour appeler le client ; il ne sert pas à identifier ou sélectionner automatiquement une fiche.
- **Critères d'acceptation :**
    - Plusieurs fiches client peuvent enregistrer le même numéro de téléphone.
    - Chaque fiche reste identifiable séparément par son nom et ses autres informations.
    - La création rapide depuis le calendrier crée une nouvelle fiche même si une autre utilise déjà le même numéro.
    - La recherche et la sélection d'un client dans le calendrier restent basées sur le nom et l'identifiant de la fiche, jamais sur le téléphone.

#### Envoyer au client les informations de réservation par e-mail

- **Type :** Amélioration
- **Statut :** Implémentée — envoi et contrôles d'accès validés par tests automatisés le 8 octobre 2026 ; réception réelle et lien du portail à vérifier en bêta.
- **Priorité :** À définir
- **Constat :** Le personnel peut enregistrer l'adresse e-mail d'un client, mais ne dispose pas d'une action pour lui signaler que cette adresse est associée à sa fiche et doit servir aux réservations en ligne.
- **Amélioration souhaitée :** Ajouter sous l'adresse e-mail un bouton permettant au personnel d'envoyer un message au client. Le message confirme que l'adresse est enregistrée dans sa fiche, lui demande de l'utiliser pour ses réservations en ligne et contient un bouton ouvrant le portail de réservation de son organisation. Le client confirme verbalement au personnel qu'il a reçu le message ; aucun lien de vérification ni état de validation n'est requis.
- **Critères d'acceptation :**
    - Le personnel peut envoyer le message à l'adresse enregistrée dans la fiche ; si l'adresse vient d'être modifiée, elle est enregistrée avant l'envoi.
    - Le message précise que l'adresse est enregistrée dans la fiche et doit être utilisée pour prendre des rendez-vous en ligne.
    - Le message invite le client à confirmer verbalement au personnel qu'il l'a reçu.
    - Le bouton « Réserver en ligne » mène au portail de réservation de la bonne organisation.
    - L'envoi échoue avec un message explicite si l'adresse manque, si le portail n'est pas disponible ou si le fournisseur d'e-mail refuse l'envoi.

Cette notification ne valide pas techniquement l'accès à l'adresse. Le portail
continue de vérifier l'accès à l'e-mail au moment de la connexion grâce au code
à usage unique.

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

#### Choisir un domaine dans les outils d’administration technique

- **Type :** Amélioration
- **Statut :** Implémentée — critères automatisés validés le 8 octobre 2026 ; recette manuelle bêta à effectuer.
- **Priorité proposée :** P2
- **Constat :** Les outils de signalement et de campagne de test sont réservés aux administrateurs techniques et présentent des données de plusieurs organisations, sans contexte commun permettant de se concentrer sur une organisation.
- **Amélioration souhaitée :** Conserver les pages « Signalements » et « Campagnes de test » dans le menu TECH_ADMIN et permettre de choisir une ou plusieurs organisations depuis ce menu, ou de revenir à une vue globale.
- **Critères d'acceptation :**
  - Le menu TECH_ADMIN propose « Tous les domaines » ainsi que chaque organisation, y compris celles sans signalement ou campagne ; plusieurs organisations peuvent être sélectionnées simultanément.
  - Le choix est conservé lors du passage entre les signalements et les campagnes ; « Tous les domaines » reste la vue par défaut.
  - Le filtre s'applique aux signalements et à la liste et aux indicateurs des campagnes. Un filtre de signalements permet d'afficher tous les états ou seulement les signalements non résolus (« Nouveau » et « En cours »).
  - Une campagne est préremplie avec l'organisation sélectionnée si une seule est choisie ; sinon le TECH_ADMIN choisit explicitement l'organisation cible et peut toujours sélectionner toute organisation.
  - Les filtres de données sont validés côté serveur et les pages et API restent réservées au rôle TECH_ADMIN.
- **Mise à jour :** La revue du 8 octobre 2026 n'a relevé aucun problème confirmé. Le scénario `ADM-12` couvre maintenant le choix de plusieurs organisations et le filtre des signalements non résolus. La vérification manuelle avec un compte TECH_ADMIN et les données bêta reste à effectuer.

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

### Gestion des stocks — produits revendus

- **Type :** Amélioration
- **Statut :** À cadrer — suivi dans le [GitHub Project](https://github.com/users/Fadgag/projects/1) et l'[Issue associée](https://github.com/Fadgag/lindependance/issues/65).
- **Priorité proposée :** P3
- **Constat :** Le stock d'un produit peut être modifié manuellement et est décrémenté lors de son encaissement, mais il n'existe pas de seuil d'alerte ni d'historique des entrées et ajustements.
- **Amélioration souhaitée :** Permettre au personnel de suivre les entrées et ajustements de stock des produits revendus, de définir un seuil minimum par produit et de repérer rapidement les produits à réapprovisionner.
- **Impact :** Réduire les ruptures de produits vendus aux clients et faciliter le contrôle des quantités.
- **Critères d'acceptation :**
  - Un membre autorisé peut enregistrer une entrée ou un ajustement de stock et consulter l'historique associé au produit.
  - Un seuil minimum configurable permet d'identifier les produits à réapprovisionner dans la liste des produits.
  - Une vente décrémente le stock une seule fois ; les mouvements et quantités restent isolés par organisation.

### Gestion des stocks — consommables utilisés en prestation

- **Type :** Amélioration
- **Statut :** À cadrer — le moment où la consommation est décomptée et le traitement d'un stock insuffisant restent à décider. Suivi dans le [GitHub Project](https://github.com/users/Fadgag/projects/1) et l'[Issue associée](https://github.com/Fadgag/lindependance/issues/64).
- **Priorité proposée :** P3
- **Constat :** Les produits sont associés à un stock et aux ventes, mais aucune quantité de consommable n'est associée à une prestation ni décomptée lors de sa réalisation.
- **Amélioration souhaitée :** Permettre d'associer à chaque prestation les consommables et quantités utilisés, puis de suivre leur consommation et leur stock restant.
- **Impact :** Aider les salons à anticiper les réapprovisionnements et à mieux connaître le coût des produits utilisés pour chaque prestation.
- **Critères d'acceptation :**
  - Un membre autorisé peut configurer les consommables et quantités nécessaires à une prestation.
  - Une prestation réalisée décompte une seule fois les quantités configurées, selon le moment de décompte choisi.
  - Une annulation ne décompte pas les consommables ; un stock insuffisant est signalé selon une règle définie avant mise en œuvre.
  - Les consommations et quantités restent isolées par organisation.

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
