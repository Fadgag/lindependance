# Feature Blueprint — Campagnes de recette et retours des testeurs
**Statut :** DRAFT
**Feature :** Campagnes de recette, checklist publique et tableau de suivi

## Objectif
Permettre à un administrateur technique de créer et suivre une campagne de
recette. Les testeurs remplissent, sans compte, une checklist issue des guides
qualité ; l'administrateur technique suit les résultats dans un tableau de bord.

## Parcours
- L'application définit un rôle global `TECH_ADMIN`, distinct de l'admin staff
  d'un salon. L'attribution est réservée au provisionnement technique ; aucun
  écran de l'application ne permet de s'attribuer ce rôle.
- Le `TECH_ADMIN` ouvre `/test-campaigns`, crée une campagne avec son nom,
  l'organisation cible, les profils de test inclus (`ADMIN`, `USER`, ou les
  deux) et un ou plusieurs groupes de scénarios. La création ne démarre que
  lorsque le `TECH_ADMIN` clique explicitement sur « Créer la campagne » ;
  saisir le nom ou appuyer sur Entrée ne soumet pas le formulaire. Le bouton
  reste visible pendant le parcours du formulaire. Il peut sélectionner jusqu'à
  50 destinataires ayant une adresse e-mail valide parmi les comptes
  `ADMIN`/`USER` et les fiches client de cette organisation. Une seule
  invitation est envoyée par adresse e-mail, même si elle figure sur plusieurs
  fiches. Cette sélection sert uniquement à l'envoi et n'est pas enregistrée
  dans la campagne. Il peut personnaliser l'objet et le
  message texte de l'invitation ; le gabarit HTML, le prénom, le résumé de la
  campagne et le bouton vers les scénarios restent gérés par l'application.
  La campagne est active à sa création ; aucun hash de commit n'est requis.
- La campagne possède un lien public dédié `/retour-test/[campaignToken]`.
  Le jeton est aléatoire et opaque ; il ne révèle pas l'identifiant interne de
  l'organisation. Il est stocké pour permettre de réafficher et copier le lien
  depuis le dashboard. Le lien n'est utilisable que tant que la campagne est
  active.
- Le tableau de bord liste les campagnes de toutes les organisations avec leur
  état, parcours sélectionnés, dates et progression. La vue détaillée regroupe
  les résultats par scénario ; pour la progression et le statut courant, seul
  le résultat le plus récent de chaque couple profil/scénario compte.
  L'historique conserve tous les envois.
- Le `TECH_ADMIN` peut fermer une campagne ; ses liens de test deviennent
  alors en lecture seule/indisponibles pour les nouvelles soumissions.
- Formulaire public sans compte, accessible uniquement par le lien de campagne.
- Le testeur choisit son rôle déclaratif : « Client du salon » (`USER`) ou
  « Gérant du salon » (`ADMIN`). Ce choix sert uniquement à classer le retour
  et n'est jamais une preuve d'identité ni un droit d'accès.
- La page publique affiche le vrai nom et le slug de l'organisation cible à la
  place des alias de guide comme `ORG-A`. Les alias de jeux de données et les
  chemins de page connus sont présentés en termes compréhensibles et les
  chemins deviennent cliquables.
- Chaque scénario propose un lien direct vers l'écran associé, si l'organisation
  et le profil disposent d'une destination connue. Ces liens s'ouvrent dans un
  nouvel onglet afin de conserver la checklist et les résultats non envoyés.
- Selon ce choix, la page affiche les scénarios de recette du guide qualité
  correspondant : `quality/recette-beta-admin.md` pour `ADMIN`,
  `quality/recette-beta-customer.md` pour `USER`, filtrés par les groupes
  sélectionnés dans la campagne.
- Les groupes sélectionnables dans la campagne sont : « Réservation en ligne »
  (CUS-01 à CUS-10), « Mes rendez-vous et changements » (CUS-11 à CUS-15),
  « Sécurité et mobile » (CUS-16 à CUS-17) et « Administration staff »
  (ADM-01 à ADM-12). Dans la checklist publique, ils sont présentés comme
  « Prendre rendez-vous », « Gérer mes rendez-vous », « Confidentialité et
  téléphone » et « Gérer le salon ». Chaque profil activé doit avoir au moins
  un groupe correspondant.
- Chaque point à tester reprend son titre, ses étapes et ce qui devrait se
  passer depuis le guide. Dans la checklist publique, les identifiants internes
  (`CUS-*`, `ADM-*`) et priorités (`P0`-`P2`) ne sont pas affichés. Une case à
  cocher marque le point comme fait ; le testeur choisit une réponse formulée
  simplement et peut raconter ce qui s'est passé. Un commentaire est
  obligatoire si le test ne s'est pas bien passé ou n'a pas pu être terminé.
- Toute l'interface est en français par défaut ; aucun choix de langue n'est
  demandé au testeur. Le profil choisi doit être inclus dans la campagne.
- Le testeur peut cocher et envoyer plusieurs scénarios à la fois. Un scénario
  non coché n'est pas enregistré.
- Le navigateur/appareil peut être indiqué par le testeur et s'applique à tous
  les scénarios envoyés dans la même soumission.
- Cocher un scénario ou modifier son résultat ne déclenche aucun envoi réseau.
  Le testeur envoie explicitement les résultats en attente avec un bouton
  toujours visible ; les scénarios déjà envoyés restent cochés et identifiés
  comme envoyés jusqu'à la fermeture ou au rechargement de la page.
- Le brouillon du testeur (résultats sélectionnés, commentaires, navigateur et
  réponses au questionnaire) est conservé dans le stockage local du navigateur,
  séparément par campagne et profil, et restauré après réouverture de la page.
  Un problème de stockage local est signalé sans empêcher l'envoi manuel. Le
  formulaire avertit de ne pas saisir de nom ni de coordonnées.
- À la fin de la checklist, le testeur peut répondre à un questionnaire
  facultatif : compréhension des consignes, durée de la campagne, utilité des
  liens directs et satisfaction générale. Il peut ajouter un commentaire ou
  une suggestion d'amélioration de 2 000 caractères maximum. Le formulaire
  n'enregistre cet avis qu'avec au moins un scénario coché.
- Les réponses générales sont enregistrées séparément des résultats par
  scénario, sans coordonnées ni identifiant personnel. Le tableau de suivi
  technique les présente avec le profil déclaratif et la date de réception.
- Les retours sont liés à l'organisation cible de la campagne résolue côté
  serveur ; aucune organisation ne vient du navigateur.
- L'accès à `/test-campaigns` et aux API de gestion/suivi est réservé au
  `TECH_ADMIN`, qui voit les campagnes et retours toutes organisations
  confondues. Les admins de salon n'ont pas accès au tableau de bord technique.

## Maquettes fonctionnelles

Les maquettes sont filaires et décrivent la hiérarchie des contenus ; elles
seront adaptées au système visuel existant. La liste des scénarios provient du
guide de recette correspondant au profil choisi. Le tableau de bord technique
est global ; les campagnes sont identifiées par organisation. Sur mobile, les
cartes et le formulaire s'empilent, et les tableaux deviennent des listes de
cartes lisibles.

### Création et suivi des campagnes — bureau

```text
+-----------------------------------------------------------------------+
| Suivi des campagnes de test                         [Nouvelle campagne] |
|                                                                       |
| [Actives : 2] [Scénarios réussis : 18] [Échecs : 3] [Bloqués : 1]      |
|                                                                       |
| Campagne              Organisation  Parcours      État      Avancement  |
| Recette portail       Osez le T're  Réservation   Active    8 / 10      |
| [Ouvrir le suivi] [Copier le lien testeur] [Fermer]                    |
| --------------------------------------------------------------------- |
| Campagne terminée   Osez le T're   Portail client  Clôturée 29 / 29  |
|                                                                       |
| Nouvelle campagne                                                       |
| Nom [____________________] Organisation [Choisir... v]                |
| Destinataires (facultatif) [x] Camille [x] Cliente Léa [ ] ...        |
| Profils [x] Gérant du salon [x] Client du salon                      |
| Parcours [x] Réservation en ligne [x] Mes RDV [ ] Admin staff ...    |
|                                                   [Créer la campagne]   |
+-----------------------------------------------------------------------+
```

### Checklist publique — bureau

```text
+-----------------------------------------------------------------------+
| TEST DU SALON                                                         |
| Recette bêta portail                                                  |
| Salon : [Nom du salon]                                                |
| Vous allez essayer : Prendre rendez-vous                              |
| Pas besoin de créer un compte ni d’indiquer votre nom.                |
|                                                                       |
| Vous testez en tant que… *                                            |
| ( ) Client du salon                  ( ) Gérant du salon              |
|                                                                       |
| Sur quel appareil faites-vous le test ? (facultatif) [____________]   |
|                                                                       |
| Points à essayer                                                      |
|                                                                       |
| [x] Ouvrir la réservation du bon salon                                |
|     Étapes : ouvrez le lien de réservation reçu…                      |
|     Ce qui devrait se passer : la réservation s’ouvre pour ce salon.  |
|     [Ouvrir le portail de réservation]                                |
|     Comment cela s’est-il passé ? [Tout s’est bien passé v]           |
|     Que s’est-il passé ? [____________________________________]      |
|                                                                       |
| Votre avis sur ce test (facultatif)                                    |
| Consignes [Choisir une réponse v]  Durée [Choisir une réponse v]       |
| Liens utiles [Choisir une réponse v]  Avis général [Choisir... v]     |
| Votre commentaire ou une idée pour améliorer ce test [_____________]  |
|                                                                       |
| Rien n’est envoyé avant votre clic.                                   |
|                                  [ Envoyer mes réponses ]              |
+-----------------------------------------------------------------------+
```

### Détail du suivi — bureau

```text
+-----------------------------------------------------------------------+
| Recette bêta portail · Osez le T're · Réservation en ligne [Fermer]    |
| Lien testeur [https://.../retour-test/...] [Copier le lien]            |
|                                                                       |
| Avancement : 18 / 29 scénarios testés                                  |
| [Réussis : 14] [Échecs : 3] [Bloqués : 1] [À tester : 11]              |
|                                                                       |
| Profil [Tous v]  Résultat [Tous v]  [Rechercher un scénario...]        |
|                                                                       |
| Résultat courant par scénario (dernier envoi)                          |
| CUS-01 Résolution organisation   Réussi    Dernier retour : 09:30      |
| CUS-02 Choix prestation          À tester                              |
| CUS-08 Réservation               Échec     Voir commentaire            |
| --------------------------------------------------------------------- |
| Historique des retours                                                  |
| Date       Profil       Scénario             Résultat    Commentaire    |
| 02/10 09:30 Utilisateur  CUS-08 Réservation   Échec       ...           |
|                                                                       |
|                         [Afficher plus]                                |
+-----------------------------------------------------------------------+
```

### Adaptation mobile

```text
+------------------------------+
| Recette bêta · Réservation en ligne |
| 18 / 29 testés               |
| [Réussis 14] [Échecs 3]      |
|                              |
| CUS-01 · Réussi              |
| Dernier envoi : 09:30        |
|                              |
| CUS-08 · Échec               |
| Voir le commentaire          |
+------------------------------+
```

## Données
- Ajouter `TestCampaign`, lié à `Organization`, avec nom, profils inclus,
  groupes de scénarios inclus, état (`ACTIVE`/`CLOSED`), identifiant public
  opaque généré aléatoirement, date de création et fermeture. L'identifiant public est
  stocké pour permettre au tableau de bord de réafficher et copier le lien ;
  il ne remplace jamais les contrôles d'accès du tableau de bord.
- Le champ historique `build` est conservé nullable pour compatibilité avec
  les campagnes déjà créées ; les nouvelles campagnes n'en demandent pas.
- Les groupes filtrent exclusivement les scénarios provenant des guides
  qualité. Les campagnes historiques sans groupes sont interprétées comme
  incluant tous les scénarios correspondant à leurs profils.
- Ajouter `TestFeedback`, lié à la campagne et à l'organisation, avec profil,
  identifiant et instantané du scénario (titre/priorité), résultat,
  navigateur/appareil, commentaire et date de création. Chaque ligne
  correspond au résultat d'un scénario.
- Ajouter `TestCampaignReview`, lié à la campagne et à l'organisation, avec
  profil déclaratif, réponses facultatives aux questions prédéfinies, un
  commentaire facultatif et la date de création. Ne pas stocker d'identifiant
  de testeur ; plusieurs avis anonymes par campagne sont possibles.
- Ne pas associer le feedback à un compte utilisateur ni à un testeur identifié.
- Ne pas stocker nom, email, adresse IP ni autre identifiant personnel du
  testeur. Le profil est librement choisi par le visiteur.
- La liste des contacts sélectionnés pour l'invitation n'est pas persistée et
  n'est jamais associée aux feedbacks. Les retours restent anonymes même si un
  destinataire ouvre le lien depuis son compte.
- Les destinataires sont les comptes `ADMIN`/`USER` et les fiches `Customer`
  ayant une adresse e-mail valide et appartenant à l'organisation choisie.
  L'API vérifie côté serveur la source et l'ID de chaque entrée ; la sélection
  est limitée à 50 contacts et dédupliquée par adresse e-mail sans distinction
  de casse.
- Chaque invitation est envoyée individuellement par e-mail avec le lien public.
  Les envois réussis et les destinataires en échec sont signalés au créateur ;
  une campagne créée n'est pas annulée en cas d'échec partiel d'envoi.
- L'objet personnalisé est borné à 120 caractères et ne peut contenir de
  retour à la ligne ; le message texte facultatif est borné à 2 000 caractères.
  Le HTML est toujours échappé et composé par le gabarit stylé de l'application.
- Les identifiants de scénarios valides proviennent du guide correspondant au
  profil résolu côté serveur et aux groupes actifs de la campagne ; les
  libellés/priorités reçus du navigateur ne font pas autorité.
- Les champs texte doivent être bornés par Zod ; le formulaire public doit
  appliquer le rate limit distribué déjà disponible pour le portail client
  (60 envois par campagne et par heure). La limite est indexée sur le jeton de
  campagne haché ; l'application ne lit ni ne stocke l'adresse IP du testeur.
- Le tableau de bord calcule la couverture à partir du résultat le plus récent
  de chaque couple (profil, scénario) dans la campagne ; tous les envois restent
  disponibles dans l'historique.
- Ajouter une migration Prisma additive. Ne pas l'appliquer à une base distante
  dans le cadre de l'implémentation.

## API
- `GET/POST /api/test-campaigns` : `TECH_ADMIN` uniquement ; lister et créer
  des campagnes, avec organisation et destinataires résolus et vérifiés côté
  serveur. `recipientIds` est facultatif et limité à 50 références de compte
  ou de fiche client ; l'objet et le message d'invitation sont validés côté
  serveur.
- `GET /api/test-campaigns/recipients?organizationId=...` : `TECH_ADMIN`
  uniquement ; lister les comptes et clients invitables d'une organisation
  sans exposer d'autres organisations.
- `GET /api/test-campaigns/[id]` : `TECH_ADMIN` uniquement ; détail, avancement
  et historique de la campagne.
- `PATCH /api/test-campaigns/[id]` : `TECH_ADMIN` uniquement ; fermer une
  campagne, sans suppression ni réouverture en phase 1.
- `GET /api/test-feedback/[campaignToken]` : public ; obtenir le nom de la
  campagne, ses profils disponibles et le checklist approprié.
- `POST /api/test-feedback/[campaignToken]` : public, validation Zod des
  résultats et du questionnaire facultatif,
  rate limit, contrôle campagne active, validation des scénarios et création
  atomique des scénarios cochés et de l'avis général éventuel.

## Hors périmètre
- Création ou modification des scénarios dans l'application : les guides
  Markdown existants restent la source des scénarios disponibles.
- Collecte de coordonnées dans le formulaire public, pièces jointes,
  captures d'écran ou réponse depuis l'application. Les invitations aux
  comptes et clients existants utilisent leurs adresses déjà enregistrées sans
  les conserver dans la campagne.
- Suppression ou classement manuel des retours après soumission.
- Réouverture d'une campagne fermée.

## Definition of Done
1. Seul le `TECH_ADMIN` provisionné peut créer, consulter et fermer une
   campagne ; les admins staff ne peuvent pas accéder au tableau de bord.
   Le rôle n'est attribuable que par le provisionnement technique, jamais par
   une action utilisateur dans l'application.
2. Chaque campagne référence une organisation et un ou plusieurs groupes de
   scénarios compatibles avec ses profils ; le lien public dédié ne révèle ni
   ID d'organisation ni ID interne de campagne.
3. Le `TECH_ADMIN` peut envoyer le lien à un maximum de 50 comptes `ADMIN` ou
   `USER` et de fiches client ayant une adresse e-mail valide dans
   l'organisation sélectionnée ; les IDs d'une autre organisation ou d'une
   autre source sont refusés, chaque adresse ne reçoit qu'une invitation,
   l'objet et le message sont personnalisables et les envois partiels sont
   rapportés sans perdre le gabarit stylé.
4. Un testeur non connecté voit en français le checklist correspondant au
   profil choisi parmi les profils autorisés et peut envoyer plusieurs
   résultats en une fois.
5. La page de campagne montre le nom et le slug de l'organisation ; les étapes
   ne montrent pas les alias internes du guide et proposent les liens directs
   vers les écrans associés, sans lien de portail erroné si aucun slug n'est
   configuré ou si le portail client est désactivé.
6. Un testeur peut envoyer un avis général facultatif avec un ou plusieurs
   scénarios cochés. Les réponses aux listes prédéfinies et le commentaire
   apparaissent dans le suivi technique, sans données personnelles.
7. Les scénarios non cochés ne sont pas créés ; les commentaires sont exigés
   pour les échecs et blocages ; les liens invalides ou campagnes fermées sont
   refusés explicitement.
8. Chaque retour est lié à la campagne et à son organisation, sans accepter
   d'identifiants d'organisation ou des libellés de scénarios du navigateur.
9. Le tableau de bord montre progression, résultats courants par scénario et
   historique complet ; le résultat courant est le dernier par profil et
   scénario.
10. Aucune donnée personnelle du testeur ni liste de destinataires n'est stockée.
   Rate limit, droits et
   isolation sont testés ; TypeScript et lint passent.
11. Depuis le détail d'une campagne, le `TECH_ADMIN` peut télécharger un fichier
    JSON UTF-8 comprenant les métadonnées de campagne, les scénarios et leur
    résultat courant, l'historique complet et les réponses/commentaires du
    questionnaire. L'export n'inclut ni le jeton public, ni les identifiants
    internes de campagne ou d'enregistrement, ni les destinataires.
