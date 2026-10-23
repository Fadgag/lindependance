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

Pour éviter une numérotation parallèle, les entrées déjà suivies dans le GitHub
Project reprennent le numéro de leur issue GitHub. Le statut du Project est
indiqué séparément ; « Backlog » signifie que l'issue est créée mais pas encore
en cours de traitement.

## À traiter

### Portail client — annulation des rendez-vous

#### [#94](https://github.com/Fadgag/lindependance/issues/94) Bloquer l’annulation client des rendez-vous déjà payés

- **Type :** Bug
- **Statut :** Correctif appliqué et tests automatisés vérifiés localement le 14 octobre 2026 ; validation manuelle en bêta à effectuer avant clôture de l'issue.
- **Priorité proposée :** P1
- **Comportement observé :** L'éligibilité à l'annulation en ligne ne tenait compte que du délai de 24 heures. Un rendez-vous payé (`PAID`, `PAYED` ou associé à un `finalPrice` positif) pouvait donc être proposé pour annulation ; pour un rendez-vous lié à un forfait, cela pouvait recréditer une séance sans annuler le paiement.
- **Comportement attendu :** Un rendez-vous payé ne peut jamais être annulé par le client en ligne. Le statut du rendez-vous et les crédits associés restent inchangés après un refus.
- **Étapes de reproduction :** Dans l'environnement bêta, ouvrir l'espace client avec un rendez-vous de test payé prévu à plus de 24 heures et vérifier qu'aucune annulation en ligne n'est proposée. Si un forfait est lié, relever son solde avant et après le test.
- **Impact :** L'état du rendez-vous, le paiement enregistré et les crédits du forfait peuvent ne plus correspondre.
- **Critères d'acceptation :**
  - Les statuts payés `PAID` et `PAYED`, ainsi qu'un `finalPrice` positif, ne sont pas annulables en ligne, y compris au-delà de 24 heures.
  - Un refus ne modifie ni le rendez-vous ni le solde du forfait associé.
  - Un rendez-vous non payé reste annulable uniquement lorsqu'il est prévu à plus de 24 heures.
  - Les règles sont couvertes par des tests de domaine et de service.
- **Résultat :** Le domaine et la mise à jour transactionnelle bloquent les rendez-vous payés, y compris si seul `finalPrice` indique le paiement. Les tests ciblés, le lint et le type-check réussissent ; une vérification manuelle en bêta reste nécessaire.

### Portail client — réservation en ligne

#### Limiter les réservations à deux mois glissants

- **Type :** Amélioration
- **Statut :** Implémenté localement le 22 octobre 2026 ; vérification manuelle en préproduction après déploiement.
- **Priorité proposée :** P2
- **Constat initial :** Le sélecteur de date du portail ne définissait pas de date maximale, et l'API n'appliquait pas de limite supérieure. La fenêtre de deux mois chargée dans l'agenda concernait l'agenda staff, pas le portail client.
- **Résultat souhaité :** Un client peut consulter et réserver uniquement dans une fenêtre glissante de deux mois.
- **Impact :** Un client peut réserver trop longtemps à l'avance par rapport à la période d'ouverture prévue par le salon.
- **Critères d'acceptation :**
  - Les calendriers de réservation et de demande de changement n'affichent aucune date au-delà des 60 jours glissants.
  - L'API de créneaux et les API de création de réservation ou de demande de changement refusent aussi toute date située après cette limite, même si la requête est envoyée directement.
  - La borne exacte de 60 jours est incluse ; les dates sont exprimées dans le fuseau horaire du salon.
  - Des tests vérifient la date maximale, la borne exacte et le refus des réservations ou demandes de changement juste au-delà.
- **Décision prise :** 60 jours exacts à partir de l'instant courant, borne incluse.
- **Résultat :** Les sélecteurs de réservation et de demande de changement fixent la même borne de date. L'API de créneaux rejette les dates hors fenêtre et la règle métier filtre les départs au-delà de l'instant limite. Les services de réservation et de demande de changement revalident cette borne côté serveur. Tests ciblés réussis ; recette manuelle bêta après déploiement.

#### Associer les domaines publics aux portails des salons

- **Type :** Bug
- **Statut :** PR #127 fusionnée dans `preprod` ; migration à appliquer. Correction locale du bouton d'ajout invisible prête à publier.
- **Priorité proposée :** P1
- **Comportement observé :** À la racine du site, un visiteur arrive sur la connexion staff si plusieurs portails sont activés, même quand le domaine est dédié à un salon.
- **Comportement attendu :** Chaque domaine configuré ouvre directement la réservation du salon qui lui est associé.
- **Reproduction :** ouvrir la racine d'un domaine de salon lorsque plusieurs portails clients sont actifs ; le visiteur est redirigé vers `/auth/signin`.
- **Critères d'acceptation :**
  - L'équipe admin_technique associe chaque nom d'hôte à un salon depuis `/tech-admin/portal-domains` ; l'association est stockée en base.
  - Le formulaire affiche un bouton d'ajout visible et utilisable lorsqu'un domaine et un salon sont renseignés.
  - Un domaine associé redirige à la racine vers le bon portail, indépendamment du nombre d'autres portails actifs.
  - Si le portail associé est désactivé ou indisponible, la racine ne bascule pas vers un autre salon.
  - Un domaine non associé conserve le comportement de secours existant ; une configuration invalide est signalée explicitement.
- **Résultat :** La résolution de l'hôte et l'écran de gestion ont été fusionnés dans `preprod`. Le bouton d'ajout utilisait une variable CSS inexistante, ce qui rendait son fond transparent et son libellé blanc invisible ; une correction locale le rattache à la couleur de thème existante. Après publication de cette correction et application de la migration, associer `testing.osezletre.fr` au salon Osez l’Etre dans `/tech-admin/portal-domains`, puis vérifier la racine.

### Portail client — demandes de changement de créneau

#### Notifier le client par e-mail de la décision sur sa demande de changement

- **Type :** Amélioration
- **Statut :** Implémenté localement ; migration et envoi réel à vérifier en préproduction.
- **Priorité proposée :** P1
- **Constat :** Après approbation ou refus d'une demande, le portail client affiche le nouvel horaire ou le motif de refus, mais aucun e-mail de décision n'est envoyé. Cette absence a été constatée en préproduction le 22 octobre 2026 pour une demande approuvée et une demande refusée.
- **Amélioration souhaitée :** Informer par e-mail le client de la décision du salon afin qu'il sache si son rendez-vous a changé ou si l'horaire initial est maintenu.
- **Impact :** Sans notification, le client peut manquer un changement d'horaire ou ne pas voir le refus de sa demande.
- **Critères d'acceptation :**
  - Après approbation, un e-mail confirme la nouvelle date et heure du rendez-vous, la prestation et le salon.
  - L'e-mail d'approbation joint une invitation calendrier `.ics` qui met à jour le même rendez-vous avec une séquence incrémentée.
  - Après refus, un e-mail indique que la demande a été refusée et inclut le motif du staff lorsqu'il existe ; sans motif, le message reste explicite et neutre.
  - La notification est adressée uniquement à l'adresse vérifiée conservée à la création de la demande et respecte l'organisation du rendez-vous.
  - L'envoi intervient après la décision enregistrée ; un échec d'e-mail ne rétablit pas l'ancien horaire ni ne transforme une décision déjà prise.
  - Une demande historique sans adresse vérifiée reste traitable ; l'interface staff avertit qu'aucun e-mail n'a pu être envoyé.
  - Des tests couvrent l'approbation, le refus avec et sans motif, l'absence d'envoi si la décision échoue, l'adresse vérifiée et l'isolation entre organisations.
- **Décision prise :** l'e-mail d'approbation joint une invitation calendrier `.ics` mise à jour avec le même UID et une séquence incrémentée.
- **Vérification restante :** appliquer la migration en préproduction, contrôler la réception réelle des e-mails dans une boîte de test et importer l'invitation mise à jour dans Google Calendar.

### Signalement du 19 octobre 2026

#### Diagnostiquer l'erreur « Configuration » à la connexion staff en préproduction

- **Type :** Bug
- **Statut :** Résolu et vérifié en préproduction le 19 octobre 2026 — la migration `20261013143500_add_auth_rate_limit` manquait et a été appliquée ; la connexion staff fonctionne de nouveau.
- **Priorité proposée :** P1
- **Comportement observé :** Une personne signale ne plus pouvoir se connecter avec le parcours staff ; une erreur `401` a été vue dans la console, suivie du message « Configuration » sur la page.
- **Cause confirmée :** L'autorisation de connexion écrit dans la table `AuthRateLimit`, créée par `20261013143500_add_auth_rate_limit`. La migration manquait sur la base de préproduction ; son application a été confirmée par l'opérateur.
- **Comportement attendu :** Un compte staff valide peut se connecter en préproduction sans erreur de configuration ; des identifiants invalides restent signalés comme un échec de connexion normal.
- **Étapes de reproduction connues :** Ouvrir `/auth/signin` sur le site de préproduction et tenter le parcours de connexion staff. Le moment précis où le `401` apparaît et l'URL de la requête restent à relever.
- **Impact :** La connexion au compte staff peut être bloquée en préproduction.
- **Critères d'acceptation :**
  - La requête qui répond `401` et l'erreur serveur correspondante sont identifiées.
  - La migration `20261013143500_add_auth_rate_limit` est appliquée sur la base de préproduction.
  - Une connexion avec un compte staff de test fonctionne et redirige vers l'espace attendu sans afficher « Configuration ».
- **Résultat :** Après application de la migration manquante, l'utilisateur confirme que la connexion fonctionne de nouveau.

#### Ne pas afficher les rendez-vous d'un autre salon dans le portail client

- **Type :** Bug
- **Statut :** Résolu et vérifié en préproduction le 20 octobre 2026 après actualisation de la nouvelle version.
- **Priorité proposée :** P1
- **Comportement observé :** Une session client authentifiée sur un salon a ouvert la page « Mes rendez-vous » d'un salon de test différent. L'identité affichée correspondait au salon de test, mais la page présentait encore les rendez-vous du salon précédent, y compris après un rechargement complet.
- **Comportement attendu :** Une session et les rendez-vous affichés sont limités à l'organisation du portail visité ; aucun rendez-vous d'un autre salon ne doit être rendu.
- **Étapes de reproduction :** Se connecter au portail client d'un salon de test, ouvrir directement `/portail/<slug-d-un-autre-salon>/mes-rdv`, puis actualiser la page.
- **Impact :** Des informations de rendez-vous peuvent apparaître dans le contexte d'un autre salon. La vérification de confidentialité entre organisations n'est pas validée et doit être résolue avant la mise en production.
- **Critères d'acceptation :**
  - Le serveur vérifie que la session client et chaque requête de rendez-vous correspondent à l'organisation de l'URL.
  - Une session authentifiée pour le salon A ne récupère ni n'affiche de rendez-vous sur le portail du salon B.
  - Des tests couvrent les requêtes directes et la navigation entre deux portails authentifiés, sans données d'une organisation dans l'autre.
- **Mise à jour :** Après actualisation de la nouvelle version, la session vérifiée du salon initial affiche toujours ses trois rendez-vous. En naviguant directement vers le portail « Mes rendez-vous » du salon de test, la page demande une vérification par e-mail et n'affiche aucun rendez-vous ; le résultat persiste après rechargement complet. La frontière entre les deux salons est ainsi vérifiée.

### Revue UI/UX du 12 octobre 2026

#### [#83](https://github.com/Fadgag/lindependance/issues/83) Rendre visible le lien vers la création d'une campagne

- **Type :** Bug
- **Statut :** À traiter — constat confirmé sur le tableau de bord TECH_ADMIN en préproduction ; hors du diff de la branche revue.
- **GitHub Project :** Carte ajoutée au projet `lindependance` ; statut à confirmer.
- **Priorité proposée :** P2
- **Comportement observé :** Sur `/test-campaigns`, le lien « Nouvelle campagne » affiche un texte blanc sans fond visible. Sa classe utilise `bg-(--studio-text)`, mais cette variable n'est pas définie ; la palette expose `--color-studio-text`.
- **Comportement attendu :** Le lien est visuellement identifiable comme une action et conserve un contraste lisible.
- **Étapes de reproduction :** Se connecter avec un compte TECH_ADMIN sur `https://testing.osezletre.fr/test-campaigns` et observer le lien en haut du tableau de bord.
- **Impact :** L'action d'accès au formulaire est difficile à repérer, même si le formulaire reste accessible plus bas sur la page.
- **Critères d'acceptation :**
  - Le lien dispose d'un fond visible avec un contraste suffisant pour son texte.
  - Le lien conserve son accès au formulaire de création aux tailles desktop et mobile.

#### [#84](https://github.com/Fadgag/lindependance/issues/84) Augmenter le contraste du bouton de création de campagne

- **Type :** Bug
- **Statut :** À traiter — constat confirmé sur le tableau de bord TECH_ADMIN en préproduction ; hors du diff de la branche revue.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Le texte blanc du bouton « Créer la campagne » est affiché sur le rose `#D4A3A1`. Le contraste mesuré dans le navigateur est d’environ 2,2:1.
- **Comportement attendu :** Le libellé du bouton principal reste lisible conformément au contraste minimal WCAG AA de 4,5:1 pour du texte de cette taille.
- **Étapes de reproduction :** Se connecter avec un compte TECH_ADMIN sur `https://testing.osezletre.fr/test-campaigns` et observer le bouton en bas du formulaire de création.
- **Impact :** Le libellé de l'action principale est difficile à lire pour les personnes ayant une déficience visuelle ou consultant l'interface dans des conditions de contraste limitées.
- **Critères d'acceptation :**
  - Le texte du bouton principal atteint au moins un contraste de 4,5:1 avec son fond à l'état actif.
  - Le bouton reste distinct et lisible à ses variantes desktop et mobile, ainsi qu'à l'état désactivé.

#### [#88](https://github.com/Fadgag/lindependance/issues/88) Empêcher l'action fixe de recouvrir le contenu et le menu mobile

- **Type :** Bug
- **Statut :** Corrigé localement — le bouton de création mobile reste dans le flux du formulaire ; tests automatisés réussis. Vérification visuelle en bêta à effectuer après mise à disposition.
- **GitHub Project :** Issue ouverte — In progress.
- **Priorité proposée :** P2
- **Comportement observé :** Le bouton fixe « Créer la campagne » reste au premier plan pendant le défilement et lorsque le menu mobile est ouvert. À 320 px, il recouvre notamment le bouton « Clôturer » d'une campagne ; dans le menu, il recouvre le bord inférieur du tiroir.
- **Comportement attendu :** L'action fixe ne masque ni les commandes des campagnes ni le menu mobile ouvert.
- **Étapes de reproduction :** Sur `/test-campaigns` à 320 px de large, faire défiler jusqu'aux cartes et observer le bouton « Clôturer » près du bas de l'écran ; ouvrir ensuite le menu hamburger.
- **Impact :** Les commandes des cartes peuvent être masquées et le bouton principal de la page se superpose à la navigation.
- **Critères d'acceptation :**
  - À 320 px, l'action fixe ne recouvre aucune commande de campagne affichée à l'écran.
  - L'ouverture du menu masque ou place derrière le tiroir le bouton fixe de création.
  - Les actions du menu restent visibles et activables lorsque le tiroir est ouvert.

#### [#87](https://github.com/Fadgag/lindependance/issues/87) Éviter le débordement du titre des destinataires sur petit écran

- **Type :** Bug
- **Statut :** À traiter — constat confirmé à 320 × 740 px en préproduction ; hors du diff de la branche revue.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Le titre « Envoyer le lien à des comptes ou clients existants (facultatif) » dépasse la largeur de son champ et la zone de défilement principale s'étend à 345 px dans un viewport de 320 px.
- **Comportement attendu :** Le titre se replie dans la largeur disponible sans créer de défilement horizontal ni couper du texte.
- **Étapes de reproduction :** Sur `/test-campaigns` à 320 px de large, descendre au formulaire et observer le titre de la section des destinataires.
- **Impact :** Une partie du contenu peut être coupée et le défilement horizontal peut gêner la lecture et l'utilisation sur un petit écran.
- **Critères d'acceptation :**
  - À 320 px, le titre tient dans le champ et se replie sur plusieurs lignes si nécessaire.
  - Le contenu du tableau de bord n'induit aucun défilement horizontal au breakpoint mobile.

#### [#76](https://github.com/Fadgag/lindependance/issues/76) Ajouter la déconnexion à la navigation mobile

- **Type :** Bug
- **Statut :** À traiter — confirmé dans le code et dans les menus mobiles TECH_ADMIN et ADMIN en préproduction ; hors du diff de la branche revue.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Le bouton « Quitter » n'est présent que dans la barre latérale desktop, masquée sous le breakpoint `md`. Le menu mobile ne propose pas de déconnexion.
- **Comportement attendu :** Une personne connectée peut fermer sa session depuis le menu mobile.
- **Étapes de reproduction :** Avec un compte TECH_ADMIN ou ADMIN en largeur mobile, ouvrir le menu hamburger et chercher l'action de déconnexion.
- **Impact :** Une personne utilisant uniquement un téléphone ne peut pas se déconnecter depuis la navigation.
- **Critères d'acceptation :**
  - Le menu mobile offre une action « Quitter » qui ferme la session et redirige vers la page de connexion.
  - Cette action reste accessible clavier et n'est pas recouverte par le bouton fixe de création.

### Revue UI/UX du profil ADMIN — 12 octobre 2026

#### [#73](https://github.com/Fadgag/lindependance/issues/73) Investiguer l'échec de chargement des produits en préproduction

- **Type :** Bug
- **Statut :** Corrigé et vérifié en préproduction le 12 octobre 2026. L'erreur Prisma `P2022` indiquait que `Product.stockMinimum` manquait dans la base. Après application de `20261009100000_product_stock_movements`, `prisma migrate status` confirme que le schéma est à jour et `GET /api/products` répond `200` avec une liste JSON vide pour l'organisation testée.
- **GitHub Project :** Issue clôturée — Done.
- **Priorité proposée :** P1
- **Comportement observé :** La page « Produits » affiche une erreur de chargement et ne présente pas le catalogue.
- **Comportement attendu :** La page charge les produits du salon ou affiche un état vide lorsque le catalogue ne contient aucun produit.
- **Étapes de reproduction :** Avec un compte ADMIN sur `https://testing.osezletre.fr/settings/products`, recharger la page et constater l'échec de `/api/products`.
- **Impact :** La gestion du catalogue de produits est indisponible sur la préproduction.
- **Critères d'acceptation :**
  - L'origine du HTTP 500 est identifiée et corrigée ou documentée comme un problème propre à l'environnement.
  - L'API répond avec les produits du salon ou une liste vide, et la page affiche le résultat sans erreur.

#### [#80](https://github.com/Fadgag/lindependance/issues/80) Rendre l'agenda utilisable sur petit écran

- **Type :** Bug
- **Statut :** Implémenté et fusionné dans `preprod` le 12 octobre 2026 — tests automatisés ciblés réussis ; validation visuelle en bêta encore à effectuer.
- **GitHub Project :** Issue ouverte — In preprod.
- **Priorité proposée :** P1
- **Comportement observé :** En vue semaine, les sept colonnes sont si étroites que les noms et dates des jours se chevauchent. En vue jour, le titre de la date se replie sur plusieurs lignes et les contrôles de changement de vue sont partiellement coupés.
- **Comportement attendu :** L'agenda conserve des jours, une date et des contrôles lisibles et utilisables sur petit écran.
- **Étapes de reproduction :** Ouvrir `/agenda` à 320 px de large, observer la vue semaine, puis passer en vue jour.
- **Impact :** La consultation et la navigation dans l'agenda deviennent difficiles sur téléphone.
- **Critères d'acceptation :**
  - Les jours et dates restent distincts en vue semaine, ou une vue mobile adaptée est proposée.
  - Le titre et les contrôles des vues jour/semaine restent visibles et activables à 320 px.

#### [#75](https://github.com/Fadgag/lindependance/issues/75) Garder les filtres de période du tableau de bord dans la zone visible

- **Type :** Bug
- **Statut :** À traiter — constat confirmé en préproduction sur viewport mobile ; hors du diff de la branche revue.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Le groupe de filtres du tableau de bord est plus large que l'écran ; le bouton « 30 derniers jours » est partiellement coupé et le groupe n'est pas défilable horizontalement.
- **Comportement attendu :** Chaque période peut être lue et sélectionnée sur mobile.
- **Étapes de reproduction :** Ouvrir le tableau de bord ADMIN sur un viewport de 320 à 384 px et observer la rangée de périodes.
- **Impact :** Le choix de période devient difficile ou impossible selon la largeur disponible.
- **Critères d'acceptation :**
  - Tous les filtres restent visibles, ou leur rangée permet un défilement horizontal évident et utilisable.
  - Aucun libellé de période n'est coupé à 320 px.

#### [#79](https://github.com/Fadgag/lindependance/issues/79) Préserver une largeur utilisable pour la recherche de clients sur mobile

- **Type :** Bug
- **Statut :** À traiter — constat confirmé en préproduction à 320 px avec un compte ADMIN ; hors du diff de la branche revue.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Dans l'en-tête de la liste des clients, le champ de recherche rétrécit à environ 80 px et le bouton « Nouveau client » devient étroit.
- **Comportement attendu :** Le champ de recherche et l'action de création restent assez larges pour être utilisés sans difficulté.
- **Étapes de reproduction :** Ouvrir `/customers` à 320 px de large et observer les contrôles de l'en-tête.
- **Impact :** La recherche et la création de clients sont difficiles à utiliser sur téléphone.
- **Critères d'acceptation :**
  - L'en-tête se réorganise ou défile de façon contrôlée au lieu de comprimer les commandes.
  - Le champ de recherche conserve une largeur suffisante et le bouton reste lisible et activable à 320 px.

#### [#74](https://github.com/Fadgag/lindependance/issues/74) Rendre le formulaire de rendez-vous accessible au clavier et aux lecteurs d'écran

- **Type :** Bug
- **Statut :** À traiter — constat confirmé par inspection DOM du formulaire ADMIN en préproduction ; aucun rendez-vous n'a été soumis.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Les libellés visibles des champs ne sont pas associés programmatiquement aux champs. Le sélecteur de client est un `div` activé par `onMouseDown`, sans rôle ni prise en charge du clavier.
- **Comportement attendu :** Les champs ont des noms accessibles et le client peut être recherché et sélectionné au clavier.
- **Étapes de reproduction :** Ouvrir « Nouveau RDV » depuis l'agenda, inspecter les champs Date, Début, Durée, Service et Note, puis tenter d'atteindre et d'ouvrir le sélecteur de client au clavier.
- **Impact :** Les technologies d'assistance n'associent pas les consignes visibles aux champs et le sélecteur de client ne peut pas être utilisé au clavier.
- **Critères d'acceptation :**
  - Chaque champ possède un libellé programmatique associé.
  - Le sélecteur de client est focalisable, s'ouvre/se ferme au clavier et annonce son état et sa sélection.

#### [#77](https://github.com/Fadgag/lindependance/issues/77) Rendre les champs et actions de prestations accessibles

- **Type :** Bug
- **Statut :** À traiter — constat confirmé par inspection DOM du réglage Prestations en préproduction ; aucune prestation n'a été modifiée.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** Les champs Durée, Prix et Couleur n'ont pas de libellé programmatique associé. Les boutons icône de modification et suppression n'ont pas de nom accessible et leur conteneur n'apparaît qu'au survol.
- **Comportement attendu :** Les champs et actions sont identifiables et utilisables au clavier, au tactile et avec un lecteur d'écran.
- **Étapes de reproduction :** Ouvrir Réglages > Prestations, inspecter les champs du formulaire et les actions des cartes sans survoler celles-ci.
- **Impact :** Des informations de formulaire et des actions de gestion peuvent être inaccessibles ou difficiles à découvrir hors souris.
- **Critères d'acceptation :**
  - Les champs Durée, Prix et Couleur ont chacun un libellé associé.
  - Les boutons modifier/supprimer ont des noms accessibles, un état de focus visible et ne dépendent pas du survol pour être découverts.

### Revue UI/UX du portail client sans connexion — 12 octobre 2026

#### [#78](https://github.com/Fadgag/lindependance/issues/78) Utiliser l'identité du salon dans l'en-tête mobile du portail

- **Type :** Bug
- **Statut :** À traiter — constat confirmé en préproduction sur les pages Réserver et Mes rendez-vous à 320 × 740 px.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Comportement observé :** L'en-tête mobile fixe affiche le libellé générique « Atelier. », puis la page affiche une seconde fois l'identité personnalisée du salon (logo et nom).
- **Comportement attendu :** Le portail client présente une identité cohérente avec celle du salon, sans en-tête générique ni répétition du nom/logo.
- **Étapes de reproduction :** Ouvrir `/portail/osezletre/reserver` ou `/portail/osezletre/mes-rdv` à 320 px de large et comparer l'en-tête fixe avec l'identité affichée dans la page.
- **Impact :** La double identité peut donner l'impression de quitter le portail du salon ou de consulter une page incomplètement personnalisée.
- **Critères d'acceptation :**
  - L'en-tête mobile utilise l'identité configurée du salon ou est masqué sur le portail client.
  - Le nom et le logo du salon ne sont pas présentés deux fois sur les pages de réservation et Mes rendez-vous.
  - L'affichage reste correct à 320 px et sur écran large.

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

#### [#123](https://github.com/Fadgag/lindependance/issues/123) Empêcher l’encaissement des rendez-vous annulés

- **Type :** Bug
- **Statut :** Correctif implémenté ; suite Vitest complète, type-check et lint ciblé réussis, revue finale sans constat confirmé le 21 octobre 2026. Recette manuelle après déploiement à terminer.
- **Priorité proposée :** P1
- **Comportement observé :** Un rendez-vous `CANCELLED` apparaît « À encaisser » dans l’historique d’une fiche client et l’ouverture de la ligne propose « Confirmer l’encaissement ». Le constat QA en préproduction n’a donné lieu à aucune confirmation.
- **Comportement attendu :** L’historique identifie clairement le rendez-vous annulé et aucune interface ni requête API ne permet de l’encaisser.
- **Étapes de reproduction :** Ouvrir une fiche client contenant un rendez-vous annulé et vérifier son libellé dans l’historique, sans confirmer d’encaissement.
- **Impact :** Un rendez-vous annulé pourrait être marqué payé, enregistrer une vente et décrémenter le stock.
- **Critères d’acceptation :**
  - L’historique distingue « Annulé » de « À encaisser » et n’ouvre pas l’encaissement pour un rendez-vous annulé.
  - L’API refuse atomiquement l’encaissement d’un rendez-vous `CANCELLED` sans modifier le rendez-vous, le paiement, le stock, les ventes ni les demandes en attente.
  - Des tests de régression couvrent le refus API, la protection de la transition concurrente et l’affichage de la fiche client.
- **Résultat :** 647 tests passent (1 ignoré), `tsc --noEmit` et ESLint strict sur les fichiers modifiés réussissent sans erreur. Revue finale : `quality/review_report/review_2026-10-21_1704.md`. La CI du premier commit a révélé des erreurs de lint préexistantes dans les deux composants touchés ; elles ont été corrigées, et la CI du commit de suivi reste à vérifier.

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

#### Stocker les jetons de réinitialisation sous forme de condensat (#102)

- **Type :** Bug
- **Statut :** Implémenté localement — migration des jetons historiques documentée pour chaque base déployée.
- **Constat :** Les jetons de réinitialisation encore valides sont stockés en clair dans la base.
- **Comportement attendu :** Seul un condensat SHA-256 est conservé ; le jeton aléatoire de 32 octets expire après une heure, reste à usage unique et ne peut être consommé qu'une fois même en cas de requêtes concurrentes.
- **Impact :** Une lecture de la base ou d'une sauvegarde expose les liens de réinitialisation encore valides.
- **Critères d'acceptation :**
  - Les nouveaux jetons sont stockés sous forme de condensat et le lien envoyé conserve le jeton original.
  - La mise à jour du mot de passe et la consommation du jeton sont atomiques.
  - Un script idempotent condense les jetons historiques sans changer leur expiration ni invalider les liens déjà envoyés.
- **Résultat :** Tests ciblés couvrant le stockage du condensat, les jetons expirés et deux consommations concurrentes ; voir `scripts/hash-password-reset-tokens.ts` pour la migration après déploiement.

#### Fiabiliser l'adresse IP utilisée pour le rate limiting derrière un proxy (#106)

- **Type :** Bug
- **Statut :** Implémenté localement — la disponibilité de `VERCEL=1` dans le projet Vercel doit être confirmée au déploiement.
- **Constat :** Les en-têtes IP reçus du client étaient utilisés sans déterminer s'ils provenaient d'un proxy de confiance.
- **Comportement attendu :** Vercel utilise `x-vercel-forwarded-for` uniquement avec son indicateur système ; l'auto-hébergement ne lit `x-real-ip` qu'après activation explicite et remplacement de l'en-tête par un proxy de confiance. Sans IP fiable, les limites par e-mail et par jeton/code continuent sans compartiment IP partagé.
- **Impact :** Un client pouvait forger les en-têtes IP et contourner les quotas par adresse.
- **Critères d'acceptation :**
  - Des en-têtes forgés sont ignorés si aucun proxy de confiance n'est configuré.
  - Une IP invalide ou une chaîne d'IP n'est pas utilisée pour le quota.
  - Les limites par e-mail et jeton restent appliquées en l'absence d'IP fiable, y compris le quota email et les essais par OTP du portail client.
- **Résultat :** Les tests ciblés couvrent les en-têtes Vercel, l'activation explicite auto-hébergée, l'absence d'IP fiable et les quotas OTP du portail ; voir `documentation/deploiement.md`.

### Retour visuel à l'appui sur les boutons

- **Type :** Amélioration
- **Statut :** À cadrer — amélioration transversale à appliquer de façon cohérente aux boutons des parcours staff et client.
- **Priorité proposée :** P2
- **Constat :** Lorsqu'on appuie sur certains boutons, leur apparence ne change pas de façon perceptible ; il est difficile de savoir si l'appui a été pris en compte.
- **Amélioration souhaitée :** Donner un retour visuel bref et cohérent à l'activation d'un bouton, par exemple une légère variation de couleur, de relief ou d'échelle.
- **Impact :** Les actions peuvent sembler ne pas avoir répondu, ce qui peut inciter à appuyer plusieurs fois.
- **Critères d'acceptation :**
  - L'appui à la souris et au tactile produit un état visuel immédiat et perceptible.
  - L'activation au clavier reste accompagnée d'un indicateur visible et accessible.
  - Les états désactivé et en chargement restent distincts du retour d'appui.
  - Le retour n'entraîne pas de déplacement de mise en page ni de répétition involontaire de l'action.

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
  - Le prix et les modalités de facturation sont définis avant toute mise en vente de l'option.

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

#### Créer et gérer les comptes de connexion des salons

- **Type :** Amélioration
- **Statut :** Implémentée localement — tests automatisés validés ; vérification manuelle en bêta avec des comptes et boîtes de test contrôlés encore à effectuer.
- **Priorité proposée :** P1
- **Constat :** La gestion des praticiens ne permet pas de créer des comptes de connexion. Le `TECH_ADMIN` ne pouvait pas ajouter le premier `ADMIN` à un salon existant et les ADMIN d'un salon ne pouvaient ni inviter ni gérer les autres comptes.
- **Amélioration souhaitée :** Permettre au `TECH_ADMIN` de choisir un salon existant sans ADMIN pour lui envoyer une invitation ADMIN, puis permettre aux ADMIN du salon d'inviter, de modifier le rôle et de supprimer les comptes de leur organisation.
- **Critères d'acceptation :**
  - Seul un `TECH_ADMIN` sur l'aperçu de la branche `preprod` peut créer le premier ADMIN d'une organisation existante ; une organisation déjà administrée est refusée.
  - Les ADMIN ne consultent et ne gèrent que les comptes de leur organisation. Ils ne peuvent pas modifier leur propre compte ni retirer le dernier ADMIN.
  - Une session déjà ouverte reprend le rôle et l'organisation actuels du compte ; une rétrogradation ou suppression ne conserve pas les anciens droits.
  - Les rôles proposés sont `USER` et `ADMIN` ; aucun parcours de salon ne peut attribuer `TECH_ADMIN`.
  - Toute invitation confirme le contrôle de la boîte, crée un compte sans mot de passe et transmet un lien à usage unique d'une heure. Aucun mot de passe ou jeton n'est exposé.
  - Les doublons et échecs d'envoi sont signalés explicitement ; les tests n'envoient pas de vrais e-mails et ne créent aucun compte en préproduction.
- **Mise à jour :** `specs/features/salon-account-management.md` décrit les parcours ; `ADM-24` couvre la gestion des comptes par un ADMIN et le lien mène à l'onglet Comptes, y compris l'application du nouveau rôle aux sessions ouvertes. `ADM-22` conserve le parcours d'activation du compte créé avec un salon de test. Les 724 tests automatisés, le type-check, le lint ciblé et le build passent ; aucune vérification bêta ni aucun envoi réel n'a été effectué.

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

#### [#116](https://github.com/Fadgag/lindependance/issues/116) Provisionner un salon de test depuis TECH_ADMIN

- **Type :** Amélioration
- **Statut :** Issue ouverte — la recette d'isolation inter-organisations attend un second salon de test en préproduction.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P2
- **Constat :** La recette du portail client doit vérifier que les données d'un salon ne sont pas visibles depuis un autre, mais la préproduction ne dispose pas d'un second salon de test. L'interface TECH_ADMIN ne permet pas de créer une organisation.
- **Amélioration souhaitée :** Permettre à TECH_ADMIN de provisionner un salon de test complet en préproduction, avec des données synthétiques, afin d'exécuter les scénarios d'isolation sans créer de données réelles ni déclencher d'e-mails vers des destinataires réels.
- **Impact :** La recette d'isolation entre organisations reste bloquée et nécessite actuellement un provisionnement manuel.
- **Critères d'acceptation :**
  - La création est réservée à TECH_ADMIN et vérifiée également côté serveur.
  - La création est refusée hors de la préproduction sur la branche `preprod`.
  - Le salon possède un nom et un identifiant de portail uniques et est clairement identifié comme environnement de test.
  - Le provisionnement fournit les éléments synthétiques minimaux pour tester le portail et l'isolation des données, sans invitation ni e-mail à un destinataire réel.
  - Le résultat affiche l'organisation créée ; les erreurs de validation ou de création sont explicites.
  - Des tests couvrent l'autorisation, le garde-fou d'environnement, le provisionnement et l'isolation des données.

#### Rendre visibles les actions de la page « Salons de test »

- **Type :** Bug
- **Statut :** Corrigé localement et vérifié par tests ciblés le 23 octobre 2026 ; vérification manuelle sur l'aperçu non effectuée.
- **Priorité :** À définir
- **Comportement observé :** Sur `/test-salons`, le texte des actions de création apparaît en blanc sur un fond transparent. Les classes de la page et des deux formulaires utilisent des variables `--studio-*` absentes, alors que les couleurs sont définies sous les tokens `--color-studio-*` de Tailwind v4.
- **Comportement attendu :** La page, ses formulaires et leurs boutons utilisent les couleurs studio définies et les deux actions sont visuellement identifiables.
- **Étapes de reproduction :** Ouvrir `/test-salons` sur l'aperçu de `preprod` avec un compte TECH_ADMIN autorisé ; constater l'absence de fond coloré sur les boutons « Créer le premier ADMIN et envoyer l’invitation » et « Créer le salon et envoyer l’activation ».
- **Impact :** Les actions d'initialisation d'un compte et de création d'un salon de test sont difficiles à repérer et à utiliser.
- **Critères d'acceptation :**
  - La page et les deux cartes utilisent les classes Tailwind v4 dérivées des tokens `--color-studio-*`.
  - Les deux boutons affichent la couleur primaire studio avec un texte studio foncé lisible.
  - Des tests de composants vérifient la classe de couleur primaire sur chaque bouton.
- **Vérification :** Tests ciblés des deux composants validés ; aucune donnée de préproduction n'a été créée et aucune invitation n'a été envoyée.

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

#### Créer automatiquement une carte GitHub pour chaque campagne de recette

- **Type :** Amélioration
- **Statut :** Implémentée localement — activer `GITHUB_PROJECT_TOKEN` sur l’hébergement et vérifier les options du champ `Statut de recette` avant la première création en bêta.
- **Priorité proposée :** P2
- **Constat :** Les campagnes sont créées et suivies dans l’application, mais leur lancement et leur validation ne disposent pas d’une carte dédiée dans le GitHub Project.
- **Amélioration souhaitée :** Créer une Issue de suivi pour chaque nouvelle campagne et l’ajouter au Project avec un statut de recette indépendant du statut de développement.
- **Critères d’acceptation :**
  - Chaque nouvelle campagne crée une carte dans le Project avec `Statut de recette` à « À lancer » ; le suivi utilise les états « À lancer », « À suivre » et « Validé ».
  - La carte renvoie au suivi de la campagne, réservé aux administrateurs techniques.
  - Aucune information de salon, invitation, lien public de test ou retour de testeur n’est publiée dans l’Issue, car le dépôt est public.
  - Une erreur d’intégration est signalée sans annuler la création de la campagne.
- **Mise à jour :** L’API de création et l’interface gèrent la génération et le résultat de la carte. L’activation réelle dépend de la configuration serveur documentée dans `docs/github-project-automation.md`.

#### Figer les scénarios utilisés par une campagne

- **Type :** Amélioration
- **Statut :** À cadrer
- **Priorité :** À définir
- **Effort :** À évaluer
- **Constat :** Les scénarios d'une campagne sont chargés depuis les guides de recette lors de chaque consultation. Une mise à jour d'un guide peut donc modifier les scénarios d'une campagne déjà lancée.
- **Amélioration souhaitée :** Enregistrer au lancement la version des guides et un instantané des scénarios utilisés. Une mise à jour des guides ne s'applique qu'aux campagnes créées ensuite.
- **Critères d'acceptation :**
  - Une campagne conserve les scénarios et la version des guides utilisés à son lancement.
  - Une mise à jour ultérieure des guides ne modifie pas les scénarios d'une campagne active ou clôturée.
  - Une nouvelle campagne utilise les scénarios correspondant aux guides en vigueur lors de son lancement.

#### [#86](https://github.com/Fadgag/lindependance/issues/86) Guider tous les tests par mission et questions étape par étape

- **Type :** Amélioration
- **Statut :** À cadrer — proposition discutée le 12 octobre 2026.
- **GitHub Project :** Issue ouverte — Backlog.
- **Priorité proposée :** P3
- **Constat :** Le testeur suit une checklist de scénarios et renseigne leurs résultats, puis peut répondre à un questionnaire général. Pour un parcours comme la réservation, cela lui demande de se repérer dans plusieurs consignes et de rapporter le résultat après coup.
- **Amélioration souhaitée :** Appliquer le même principe à tous les tests des campagnes, côté client comme côté personnel : présenter une mission concrète adaptée au scénario, laisser le testeur l'effectuer ou la tenter, puis lui poser une à une des questions courtes sur les étapes réellement vécues. Pour une réservation, par exemple, vérifier s'il a pu choisir une prestation, voir les membres du personnel, trouver un créneau et terminer la réservation. Adapter les questions suivantes à ses réponses et lui permettre de décrire un blocage.
- **Impact :** Réduire l'effort de compréhension pour tous les testeurs et faciliter des retours précis sur les étapes réellement vécues, quel que soit le parcours testé.
- **Critères d'acceptation :**
  - Tous les tests proposés dans les campagnes, pour les profils client et personnel, sont présentés comme des missions formulées en résultat attendu ; les liens utiles vers le site à tester sont fournis.
  - Après sa tentative, le testeur répond aux questions une par une en repassant les étapes pertinentes de la mission ; chaque réponse distingue une étape réussie, impossible ou non rencontrée.
  - Un blocage permet de décrire ce qui s'est passé et n'oblige pas le testeur à répondre aux questions devenues sans objet.
  - Les réponses restent rattachées à la mission et permettent à l'équipe de repérer précisément l'étape réussie ou bloquante pour chacun des tests.
  - La mission prévient le testeur lorsqu'une action crée une donnée réelle, comme une réservation, et précise quoi faire avec celle-ci après le test.

#### [#85](https://github.com/Fadgag/lindependance/issues/85) Clarifier et renforcer l’anonymat des retours de campagne

- **Type :** Amélioration
- **Statut :** Implémentée localement — validation du 13 octobre 2026, en attente de revue et de mise en ligne.
- **GitHub Project :** Issue ouverte — En cours.
- **Priorité proposée :** P2
- **Constat :** Les retours ne sont pas associés à un compte ni à un destinataire d'invitation, et aucun nom, e-mail ou adresse IP n'est demandé dans un champ dédié. Les commentaires libres et l'appareil restent toutefois conservés tels que saisis ; ils peuvent contenir des éléments identifiants. Le profil déclaré et l'heure précise peuvent également permettre une ré-identification par recoupement dans une petite campagne.
- **Amélioration souhaitée :** Aligner la promesse d'« anonymat » sur les données effectivement collectées et affichées, réduire les possibilités de ré-identification et rappeler de ne saisir aucune donnée personnelle dans chaque champ libre.
- **Critères d'acceptation :**
  - L'interface explique clairement que les retours ne sont pas reliés à un compte ou à un destinataire, sans garantir un anonymat absolu si des métadonnées ou du texte libre peuvent identifier la personne.
  - Chaque champ de commentaire et d'appareil rappelle de ne pas inclure de nom, de coordonnées ou d'informations permettant d'identifier quelqu'un.
  - Le suivi et l'export n'exposent que le profil déclaré et le jour de réception comme métadonnées contextuelles ; l'heure précise et l'appareil sont omis. L'horodatage exact reste en base pour ordonner les retours.
  - Aucun identifiant direct de testeur n'est ajouté aux enregistrements ou aux exports.
- **Mise à jour :** Le 14 octobre, le diagnostic CI a confirmé que l'état vide des destinataires pouvait s'afficher avant la sélection d'une organisation et la fin de leur chargement. Le formulaire distingue maintenant l'absence de sélection, le chargement et une réponse vide pour l'organisation active ; un test UI couvre ces états.

### Gestion des stocks — produits revendus

- **Type :** Amélioration
- **Statut :** En cours — suivi dans le [GitHub Project](https://github.com/users/Fadgag/projects/1) et l'[Issue associée](https://github.com/Fadgag/lindependance/issues/65).
- **Priorité proposée :** P3
- **Constat :** Le stock d'un produit peut être modifié manuellement et est décrémenté lors de son encaissement, mais il n'existe pas de seuil d'alerte ni d'historique des entrées et ajustements.
- **Amélioration souhaitée :** Permettre au personnel de suivre les entrées et ajustements de stock des produits revendus, de définir un seuil minimum par produit et de repérer rapidement les produits à réapprovisionner.
- **Impact :** Réduire les ruptures de produits vendus aux clients et faciliter le contrôle des quantités.
- **Critères d'acceptation :**
  - Un membre autorisé peut enregistrer une entrée ou un ajustement de stock et consulter l'historique associé au produit.
  - Une entrée est un mouvement positif ; un ajustement accepte un mouvement positif ou négatif, sans permettre un stock inférieur à zéro.
  - L'historique indique la variation et les quantités avant/après ; les ventes y sont ajoutées atomiquement avec l'encaissement.
  - Un seuil minimum configurable permet d'identifier les produits à réapprovisionner dans la liste des produits.
  - Une vente décrémente le stock une seule fois ; les mouvements et quantités restent isolés par organisation.
- **Cadrage retenu :** Le seuil vaut 0 par défaut et un produit est signalé lorsque son stock est inférieur ou égal au seuil. Le périmètre couvre les produits revendus, pas les consommables.

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

#### Empêcher une fiche client de réserver deux rendez-vous simultanés

- **Type :** Bug
- **Statut :** Correction implémentée localement et vérifiée par tests automatisés le 23 octobre 2026 ; recette manuelle à reprendre après publication. Aucune donnée de préproduction n'a été consultée ou modifiée.
- **Priorité :** P0 — réservation en double.
- **Comportement observé :** Deux fenêtres de réservation restées ouvertes peuvent confirmer un même créneau pour une même fiche client.
- **Cause reproduite dans le code :** La revalidation vérifiait les conflits du praticien sélectionné, mais pas les rendez-vous déjà confirmés de la fiche client. Le test local reproduit une seconde soumission sur le même horaire avec un autre praticien ; l'affectation des praticiens dans l'incident de préproduction n'a pas été vérifiée.
- **Comportement attendu :** Une fiche client ne peut pas avoir deux rendez-vous qui se chevauchent, même si les praticiens sélectionnés sont différents. Une seconde soumission reçoit un conflit explicite et aucune réservation n'est créée.
- **Critères d'acceptation :**
  - Une seconde soumission séquentielle d'un créneau périmé pour la même fiche est refusée.
  - Deux soumissions concurrentes pour la même fiche ne créent qu'un rendez-vous ; l'autre reçoit un conflit HTTP 409 exploitable.
  - Les rendez-vous annulés et les rendez-vous appartenant à une autre fiche ne bloquent pas la réservation.

#### Empêcher l'affichage des rendez-vous d'un autre salon

- **Type :** Bug
- **Statut :** Correction implémentée et vérifiée par tests automatisés avec deux organisations synthétiques le 20 octobre 2026. L'incident exact n'a pas été rejoué dans la base de préproduction ; aucune donnée de cette base ni de production n'a été consultée.
- **Priorité initiale :** P1 — confidentialité / isolation inter-organisation.
- **Comportement rapporté :** La page « Mes rendez-vous » d'un salon affichait son identité visuelle avec les rendez-vous de l'organisation portée par une session client déjà ouverte, y compris après rechargement.
- **Cause confirmée dans le code :** La page transmettait le slug du salon à son affichage, mais la requête `GET /api/portail/rdv` ne transmettait ni ne contrôlait ce slug. Le serveur filtrait bien les rendez-vous par l'organisation et l'adresse vérifiée de la session ; il pouvait donc retourner les rendez-vous de cette session sous l'identité visuelle d'un autre salon. Le symptôme rapporté n'a pas été reproduit sur les données réelles de préproduction.
- **Comportement attendu :** La liste est retournée uniquement si le slug demandé correspond à l'organisation de la session OTP. Un décalage ne retourne aucune donnée et la page invite à s'identifier auprès du salon demandé.
- **Reproduction automatisée :** Une session synthétique de `ORG-A` demande la liste de `ORG-B`; l'API refuse la réponse avant la recherche de rendez-vous et l'interface ne conserve aucune carte de `ORG-A` après navigation vers `ORG-B`.
- **Critères de vérification :**
  - Le slug du portail est validé et contrôlé côté serveur avec l'organisation de la session.
  - Un décalage entre organisations ne retourne aucun rendez-vous.
  - Une navigation ou un rechargement ne réaffiche jamais la liste de l'organisation précédente sous une autre identité visuelle.
  - Les réponses contenant la liste ne sont pas mises en cache par le navigateur.

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

#### Augmenter les quotas OTP pour les essais en préproduction

- **Type :** Amélioration
- **Statut :** Réalisée — limites vérifiées par les tests ciblés et le contrôle TypeScript.
- **Priorité initiale :** P2
- **Constat :** Les limites standard de demande de code ralentissent les essais répétés du parcours client en préproduction.
- **Amélioration souhaitée :** Augmenter les quotas OTP uniquement sur la preview Vercel de la branche `preprod`, sans affaiblir la production.
- **Critères d'acceptation :**
  - La preview Vercel de `preprod` accepte 10 demandes par adresse sur 15 minutes et 30 demandes ou vérifications par IP sur une heure.
  - La production, les autres previews et l'environnement local conservent les limites standard de 3 demandes par adresse et 10 opérations OTP par IP ; le maximum de 5 essais par code ne change pas.
- **Résultat :** Les quotas sont sélectionnés côté serveur à partir de `VERCEL_ENV` et `VERCEL_GIT_COMMIT_REF` ; aucun réglage externe ou changement de quota en production n'est nécessaire.

### Afficher l'identité du salon sur la page de réservation

- **Statut :** Réalisée
- **Constat :** La page de réservation n'affichait ni le logo ni le nom du salon.
- **Résultat :** Le nom du salon et son logo configuré sont maintenant affichés sur la page de réservation.

### Préparer une page de validation beta réservée à la preprod

- **Statut :** Réalisée
- **Priorité initiale :** P1
- **Résultat :** Les pages de campagne et les API de gestion et de retours sont accessibles uniquement sur la preview Vercel de la branche `preprod`. Les contrôles d'accès `TECH_ADMIN` existants restent appliqués aux API de gestion.

## Traités

### [#103](https://github.com/Fadgag/lindependance/issues/103) Ne pas exposer les messages d'erreur internes dans les réponses API

- **Type :** Bug
- **Statut :** Corrigé localement ; tests ciblés, lint et vérification TypeScript réussis.
- **Comportement observé :** Les réponses HTTP 500 centralisées renvoyaient le message de l'exception dans le champ `detail`.
- **Comportement attendu :** La réponse 500 reste générique ; les erreurs métier explicitement prévues conservent leur réponse et les détails utiles restent dans les logs serveur.
- **Étapes de reproduction :** Déclencher une erreur interne dans une route API utilisant `apiErrorResponse` et lire son corps JSON.
- **Impact :** Un client API pouvait obtenir des détails techniques issus d'une exception serveur.
- **Critères d'acceptation :**
  - Les réponses 500 ne contiennent aucun message d'exception ni champ de détail interne.
  - Les erreurs métier explicitement prévues conservent leur statut et leur message.
  - L'exception reste journalisée côté serveur pour le diagnostic.

### Agenda staff — Corriger l'erreur ScrollGrid au chargement

- **Type :** Bug
- **Statut :** Corrigé localement le 21 octobre 2026 ; contrôles ciblés réussis. Revalidation de l'agenda et de sa présentation mobile en bêta après déploiement.
- **Priorité initiale :** P1
- **Comportement observé :** Sur une session staff authentifiée, `/agenda` échoue au rendu avec `No ScrollGrid implementation`. Les requêtes de données encore en cours sont ensuite interrompues.
- **Cause confirmée :** `AppointmentScheduler` activait `dayMinWidth` avec FullCalendar 5.11.5 sans enregistrer le plugin ScrollGrid requis par le rendu horizontal.
- **Comportement attendu :** Les vues Jour et Semaine de l'agenda s'affichent sans erreur.
- **Étapes de reproduction :** Se connecter avec un compte staff, puis ouvrir `/agenda` depuis le tableau de bord ou directement.
- **Impact :** Le personnel ne peut pas consulter ni gérer les rendez-vous depuis l'agenda.
- **Correction :** Retirer `dayMinWidth` et l'indication de défilement associée ; le rendu standard de FullCalendar ne requiert pas le plugin premium ScrollGrid.
- **Vérification :** Le test UI vérifie l'absence de `dayMinWidth`, les contrôles ciblés passent et les vues Jour/Semaine sont rendues localement sans cette option. La lisibilité et le défilement sur téléphone restent à revalider dans ADM-20.

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
