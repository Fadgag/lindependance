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
  l'organisation cible, le build/commit testé et les profils de test inclus
  (`ADMIN`, `USER`, ou les deux). La campagne est active à sa création.
- La campagne possède un lien public dédié `/retour-test/[campaignToken]`.
  Le jeton est aléatoire et opaque ; il ne révèle pas l'identifiant interne de
  l'organisation. Il est stocké pour permettre de réafficher et copier le lien
  depuis le dashboard. Le lien n'est utilisable que tant que la campagne est
  active.
- Le tableau de bord liste les campagnes de toutes les organisations avec leur
  état, build, dates et progression. La vue détaillée regroupe les résultats
  par scénario ; pour la progression et le statut courant, seul le résultat le
  plus récent de chaque couple profil/scénario compte. L'historique conserve
  tous les envois.
- Le `TECH_ADMIN` peut fermer une campagne ; ses liens de test deviennent
  alors en lecture seule/indisponibles pour les nouvelles soumissions.
- Formulaire public sans compte, accessible uniquement par le lien de campagne.
- Le testeur choisit son profil déclaratif : `ADMIN` ou `USER`. Ce choix sert
  uniquement à classer le retour et n'est jamais une preuve d'identité ni un
  droit d'accès.
- Selon ce choix, la page affiche les scénarios de recette du guide qualité
  correspondant : `quality/recette-beta-admin.md` pour `ADMIN`,
  `quality/recette-beta-customer.md` pour `USER`.
- Chaque scénario reprend son identifiant, son titre, sa priorité, ses étapes
  et son résultat attendu depuis le guide. Une case à cocher marque le
  scénario comme effectué ; une fois coché, le testeur indique `PASS`, `FAIL`
  ou `BLOQUÉ` et peut ajouter un commentaire ou une preuve expurgée. Le
  commentaire est obligatoire pour `FAIL` et `BLOQUÉ`.
- Toute l'interface est en français par défaut ; aucun choix de langue n'est
  demandé au testeur. Le profil choisi doit être inclus dans la campagne.
- Le testeur peut cocher et envoyer plusieurs scénarios à la fois. Un scénario
  non coché n'est pas enregistré.
- Le build/commit vient de la campagne. Le navigateur/appareil peut être
  indiqué par le testeur et s'applique à tous les scénarios envoyés dans la
  même soumission.
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
| Campagne              Organisation  Build    État      Avancement      |
| Recette bêta portail  Osez le T're   abc123   Active    18 / 29         |
| [Ouvrir le suivi] [Copier le lien testeur] [Fermer]                    |
| --------------------------------------------------------------------- |
| Campagne terminée   Osez le T're   def456   Clôturée    29 / 29      |
|                                                                       |
| Nouvelle campagne                                                       |
| Nom [____________________] Organisation [Choisir... v]                |
| Build / commit [____________] Profils [x] Admin [x] Utilisateur       |
|                                                   [Créer la campagne]   |
+-----------------------------------------------------------------------+
```

### Checklist publique — bureau

```text
+-----------------------------------------------------------------------+
| [Nom de l'organisation]                             Retour de test      |
| Campagne : Recette bêta portail · Build : abc123                       |
|                                                                       |
| Votre profil *                                                        |
| ( ) Admin — recette administration     ( ) Utilisateur — recette client|
|                                                                       |
| Navigateur / appareil (facultatif) [____________________________]     |
|                                                                       |
| Scénarios — ADM-01 à ADM-12 ou CUS-01 à CUS-17 (selon profil)         |
|                                                                       |
| [x] CUS-01 — Résolution de l'organisation                    P0       |
|     Étapes et résultat attendu repris du guide qualité.                |
| Résultat : (o) Réussi  ( ) Échec  ( ) Bloqué                          |
|     Commentaire / preuve expurgée : [____________________________]     |
|                                                                       |
| [ ] CUS-02 — Choix de prestation, praticien et créneaux        P0       |
|     (Cocher un scénario pour afficher son résultat et commentaire.)    |
|                                                                       |
|                                                                       |
| Les commentaires sont obligatoires en cas d'échec ou de blocage.       |
|                                                                       |
|                                  [ Envoyer les scénarios cochés ]       |
+-----------------------------------------------------------------------+
```

### Détail du suivi — bureau

```text
+-----------------------------------------------------------------------+
| Recette bêta portail · Osez le T're · abc123               [Fermer]     |
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
| Recette bêta · abc123        |
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
- Ajouter `TestCampaign`, lié à `Organization`, avec nom, build/commit,
  profils inclus, état (`ACTIVE`/`CLOSED`), identifiant public opaque généré
  aléatoirement, date de création et fermeture. L'identifiant public est
  stocké pour permettre au tableau de bord de réafficher et copier le lien ;
  il ne remplace jamais les contrôles d'accès du tableau de bord.
- Ajouter `TestFeedback`, lié à la campagne et à l'organisation, avec profil,
  identifiant et instantané du scénario (titre/priorité), résultat,
  navigateur/appareil, commentaire et date de création. Chaque ligne
  correspond au résultat d'un scénario.
- Ne pas associer le feedback à un compte utilisateur ni à un testeur identifié.
- Ne pas stocker nom, email, adresse IP ni autre identifiant personnel du
  testeur. Le profil est librement choisi par le visiteur.
- Les identifiants de scénarios valides proviennent du guide correspondant au
  profil résolu côté serveur ; les libellés/priorités reçus du navigateur ne
  font pas autorité.
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
  des campagnes, avec organisation résolue et vérifiée côté serveur.
- `GET /api/test-campaigns/[id]` : `TECH_ADMIN` uniquement ; détail, avancement
  et historique de la campagne.
- `PATCH /api/test-campaigns/[id]` : `TECH_ADMIN` uniquement ; fermer une
  campagne, sans suppression ni réouverture en phase 1.
- `GET /api/test-feedback/[campaignToken]` : public ; obtenir le nom de la
  campagne, ses profils disponibles et le checklist approprié.
- `POST /api/test-feedback/[campaignToken]` : public, validation Zod,
  rate limit, contrôle campagne active, validation des scénarios et création
  atomique des scénarios cochés.

## Hors périmètre
- Création ou modification des scénarios dans l'application : les guides
  Markdown existants restent la source des scénarios disponibles.
- Ajout de pièces jointes, captures d'écran, contact du testeur ou réponse
  depuis l'application.
- Suppression ou classement manuel des retours après soumission.
- Réouverture d'une campagne fermée.

## Definition of Done
1. Seul le `TECH_ADMIN` provisionné peut créer, consulter et fermer une
   campagne ; les admins staff ne peuvent pas accéder au tableau de bord.
   Le rôle n'est attribuable que par le provisionnement technique, jamais par
   une action utilisateur dans l'application.
2. Chaque campagne référence une organisation et un build ; le lien public
   dédié ne révèle ni ID d'organisation ni ID interne de campagne.
3. Un testeur non connecté voit en français le checklist correspondant au
   profil choisi parmi les profils autorisés et peut envoyer plusieurs
   résultats en une fois.
4. Les scénarios non cochés ne sont pas créés ; les commentaires sont exigés
   pour les échecs et blocages ; les liens invalides ou campagnes fermées sont
   refusés explicitement.
5. Chaque retour est lié à la campagne et à son organisation, sans accepter
   d'identifiants d'organisation ou des libellés de scénarios du navigateur.
6. Le tableau de bord montre progression, résultats courants par scénario et
   historique complet ; le résultat courant est le dernier par profil et
   scénario.
7. Aucune donnée personnelle du testeur n'est stockée. Rate limit, droits et
   isolation sont testés ; TypeScript et lint passent.
