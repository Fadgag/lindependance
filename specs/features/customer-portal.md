# 🏗️ Skill: Feature Blueprint
**Statut :** DRAFT
**Feature :** Compte Client Light — Prise de RDV en autonomie (portail client)

> Spec de référence et source des règles métier communes. Pour implémenter une
> livraison, utiliser la spec de phase correspondante :
> [Phase 1 — Réservation](customer-portal-phase-1.md),
> [Phase 2 — Mes rendez-vous](customer-portal-phase-2.md),
> [Phase 3 — Changements validés](customer-portal-phase-3.md).

## 🎯 Objectif Métier
Permettre à un client dont la fiche a été créée et est gérée par le staff de
consulter ses rendez-vous et de prendre ou annuler lui-même un rendez-vous en
ligne. Le client prouve qu'il contrôle l'adresse email de sa fiche avec un code
OTP ; il n'y a ni compte client autonome ni mot de passe client. Un nouveau
client doit d'abord être créé par le staff.

## 🛠️ Stack & Architecture Imposée

### 0. Résolution publique de l'organisation (pré-requis structurant)
- **Constat** : l'isolation multi-tenant actuelle (`documentation/technique.md`
  §5) repose entièrement sur une session authentifiée
  (`session.user.organizationId` + header `x-org-id` injecté par
  `src/proxy.ts`). Un visiteur anonyme sur le portail n'a **aucune session** :
  il faut un mécanisme de résolution d'organisation dédié, distinct du
  proxy back-office.
- Ajout d'un champ public sur `Organization` :
  ```prisma
  model Organization {
    // ...champs existants...
    slug              String?  @unique // ex: "salon-dupont" — nullable pour compat existant, requis pour activer le portail
    portalEnabled     Boolean  @default(false)
  }
  ```
  - `slug` : identifiant public lisible, généré à la création/à l'activation
    du portail (jamais l'`id` cuid interne, pour éviter d'exposer un
    identifiant technique).
  - `portalEnabled` : **flag d'activation explicite par organisation** (cf.
    point 4 ci-dessous) — le portail est **désactivé par défaut**, une
    organisation doit l'activer volontairement (`/settings/portail`).
- Toutes les routes `/portail/*` et `/api/portail/*` résolvent l'organisation
  via `slug` (`prisma.organization.findFirst({ where: { slug, portalEnabled: true } })`),
  puis utilisent son `id` interne pour toutes les requêtes suivantes — jamais
  l'`id` directement dans l'URL publique.
- Tout endpoint de lecture publique inclut le slug dans le chemin
  (`/api/portail/[organizationSlug]/...`) afin que les accès anonymes puissent
  résoudre l'organisation. Les endpoints mutatifs client utilisent
  exclusivement l'organisation de la session OTP ; si le slug est présent dans
  leur chemin, il doit correspondre à cette organisation. Ne jamais accepter
  un `organizationId` arbitraire du navigateur.
- Si `portalEnabled` est `false` ou le `slug` inconnu → `404` (pas de fuite
  d'existence de l'organisation).

### 1. Modèle de données (Prisma)
- **Pas de modèle `CustomerAccount`** : la fiche `Customer` existante reste la
  source d'identité du client et continue d'être créée/maintenue par le staff.
  Ajouter une adresse email de contact portail nullable à cette fiche,
  modifiable uniquement par le staff :
  ```prisma
  model Customer {
    // ...champs existants...
    email String? // adresse du client ou du responsable légal/contact
  }
  ```
  - La même adresse peut apparaître sur plusieurs fiches dans la même
    organisation (ex. parent et enfant), ainsi que dans plusieurs organisations.
    C'est le staff qui établit explicitement ce lien en renseignant l'adresse
    email du parent/responsable sur la fiche de l'enfant.
  - Un OTP validé autorise l'accès à toutes les fiches de cette organisation
    ayant cette adresse email. Cette association par email est la seule
    délégation V1 ; le portail ne permet pas d'ajouter ni de retirer des fiches.
  - Un changement d'email effectué par le staff invalide les OTP en attente et
    les prochaines consultations réévaluent l'association depuis la base.
- Créer un modèle de challenge OTP, par exemple `CustomerEmailOtp`
  (`email`, `organizationId`, `codeHash`, `expiresAt`, `attempts`,
  `consumedAt`, `createdAt`), indexé pour les recherches par email,
  organisation et expiration. Ne jamais enregistrer le code en clair ;
  stocker un HMAC/hash avec un secret serveur. À la vérification, retrouver les
  fiches associées par `(organizationId, email)` ; ne pas figer une liste de
  `customerId` dans le challenge/session.
- Les quotas OTP doivent être partagés entre les instances applicatives
  (stockage durable ou rate limiter distribué) ; une limite uniquement en
  mémoire de processus n'est pas suffisante en production/serverless.
- Aucun changement à `User` ni à `PasswordResetToken` staff. Une session
  client contient `accountType: "CUSTOMER"`, `organizationId` et l'email
  vérifié, sans créer de ligne `User`/compte d'authentification client.

### 2. Authentification (Auth.js v5)
- Le client s'identifie avec le `slug` public de l'organisation et l'email
  d'au moins une fiche `Customer` existante, puis valide un OTP à usage unique. Le
  serveur résout toujours l'organisation depuis le slug (jamais un
  `organizationId` fourni par le navigateur), vérifie `portalEnabled`, puis
  trouve toutes les fiches associées par `(organizationId, email)`.
- Après validation OTP, créer une session client distincte du login staff,
  portant `accountType: "CUSTOMER"`, `organizationId` et l'email vérifié.
  Implémentation à choisir avec les capacités Auth.js du dépôt ; ne pas créer
  d'entrée `User` ni laisser une session client accéder au back-office.
- Parcours dédié `/portail/[organizationSlug]/connexion` ; pas d'inscription,
  mot de passe ou mot de passe oublié côté client. Le staff crée la fiche et
  maintient l'email.
- Parcours OTP :
  1. Le formulaire demande email et `organizationSlug`. Si une ou plusieurs
     fiches client portant cette adresse existent dans cette organisation,
     le serveur envoie un code par email. Dans tous les cas, la réponse est générique et
     identique pour empêcher l'énumération des fiches.
  2. Le client saisit le code dans un champ `autocomplete="one-time-code"`
     (autoremplissage best-effort selon navigateur/appareil ; l'API WebOTP ne
     s'applique pas aux emails).
  3. Après vérification atomique du code, il est consommé une seule fois et le
     client est authentifié pour le groupe de fiches auquel l'email vérifié est
     associé dans cette organisation.
     Aucune fiche n'est créée ou modifiée par le parcours public.
- Politique de sécurité OTP : code numérique à usage unique, expiration courte
  (10 minutes), maximum 5 essais par code, invalidation du code précédent lors
  d'un renvoi ; limiter l'envoi à **3 emails OTP par adresse sur 15 minutes**
  et **10 demandes par IP sur une heure**. Les limites doivent être appliquées
  côté serveur ; dépasser une limite retourne une erreur explicite sans révéler
  si la fiche existe.

### 3. Parcours de réservation (`/portail`)
- `/portail/[organizationSlug]/reserver` : sélection obligatoire d'une
  prestation `Service` proposée par l'organisation → **praticien** (`Staff`, cf. règle ci-dessous)
  → créneau disponible → connexion OTP si nécessaire → confirmation.
- La prestation détermine la durée réelle du rendez-vous. L'interface peut
  afficher la durée et le prix de la prestation sélectionnée ; le serveur
  recharge `Service` dans l'organisation résolue et dérive `duration`/`endTime`
  depuis `Service.durationMinutes` (ne jamais faire confiance à une durée ou un
  prix envoyés par le navigateur).
- Le calcul des créneaux libres tient compte de cette durée : un candidat
  `[startTime, startTime + durationMinutes)` est proposé seulement s'il tient
  entièrement dans les heures d'ouverture et ne chevauche ni rendez-vous
  actif du même praticien, ni indisponibilité de l'organisation. En V1, le
  modèle `Unavailability` est global à l'organisation (pas de `staffId`) :
  chaque indisponibilité bloque donc tous les praticiens. Les indisponibilités
  spécifiques par praticien sont hors scope.
  Réserver répète ce contrôle côté serveur à l'instant de l'insertion
  (§4bis) ; l'affichage des créneaux n'est pas une garantie de réservation.
- La réservation client est possible uniquement si une ou plusieurs fiches
  `Customer` existent déjà dans cette organisation avec l'email vérifié par
  OTP. Si aucune fiche correspondante n'existe, ne pas créer de client ni
  permettre la réservation ; afficher un message neutre invitant à contacter
  l'organisation.
- Si l'email vérifié correspond à plusieurs fiches (ex. mère et enfant), le
  portail affiche un sélecteur **« Pour qui est le rendez-vous ? »** avec les
  noms des fiches autorisées. Le client choisit la personne avant de réserver ;
  le rendez-vous est lié à la fiche sélectionnée. Si une seule fiche
  correspond, la sélection est masquée et cette fiche est utilisée
  automatiquement.
- **Sélection du praticien** :
  - Si l'organisation n'a **qu'un seul `Staff`**, le champ est masqué et le
    `staffId` est auto-assigné (pas de choix inutile pour le cas mono-praticien,
    cas actuel du produit).
  - Si l'organisation a **plusieurs `Staff`**, un sélecteur est affiché
    (obligatoire) pour choisir le praticien avant d'afficher les créneaux.
    En V1, tous les praticiens de l'organisation sont considérés capables
    d'effectuer toutes les prestations ; l'association configurable
    `Staff`–`Service` est reportée.
  - Règle testable dans `src/domain/appointment/` : `shouldShowStaffPicker(staffCount: number): boolean`.
- Calcul des créneaux dispo : réutiliser/étendre les règles de
  `src/domain/appointment/` (conflits **par `staffId`**, `Unavailability`,
  horaires `openingTime`/`closingTime` de `Organization`) — **aucune logique de
  conflit dupliquée côté route**. Le conflit horaire est toujours évalué par
  praticien : deux RDV à la même heure chez deux `Staff` différents ne sont
  jamais en conflit.
- Pour la V1, les heures d'ouverture/fermeture actuelles s'appliquent chaque
  jour ; ne pas ajouter de configuration des jours ouvrés. Les rendez-vous
  existants (par praticien) et les `Unavailability` déjà inscrites à l'agenda
  (globales organisation) bloquent les plages qui chevauchent. Les créneaux
  proposés doivent respecter la durée du service et rester entièrement dans la
  plage d'ouverture.
- `/portail/[organizationSlug]/mes-rdv` : liste des rendez-vous futurs des
  fiches associées à l'email de la session OTP (résolution serveur des
  `customerId` via `organizationId` + email vérifié, `startTime >= now`, statut
  différent de `CANCELLED`), triés du plus proche au plus lointain. Aucun
  `customerId` fourni par le navigateur ne peut élargir ce périmètre.
- Chaque ligne affiche la date/heure dans le fuseau de l'organisation, la
  prestation, le praticien et le statut, sans données d'autres clients.
  Actions "Annuler" (soft: passe `status` à `CANCELLED`) si le RDV est dans
  plus de 24 heures. La règle doit être implémentée/testée dans
  `src/domain/appointment/policies`. À 24h ou moins, l'annulation en ligne est
  bloquée et l'interface invite le client à contacter le staff. La règle est
  vérifiée côté serveur, dans le fuseau de l'organisation ; masquer le bouton
  seul ne suffit pas.

### 3bis. Vue Agenda anonymisée (`/portail/[organizationSlug]/agenda`)
- Le client connecté (ou anonyme) peut consulter l'agenda de l'organisation en
  vue calendrier (jour/semaine), réutilisant si possible le composant
  FullCalendar déjà utilisé côté back-office (`agenda`), en mode lecture seule
  simplifié.
- **Anonymisation obligatoire** : chaque créneau occupé (`Appointment` avec
  `status` ≠ `CANCELLED`, ou `Unavailability`) s'affiche comme un bloc
  générique **"Réservé"**, sans nom de client, sans prestation, sans note, sans
  prix. Seuls la plage horaire (start/end) et le fait que le créneau soit
  indisponible sont exposés.
- Un endpoint public/portail dédié
  `GET /api/portail/[organizationSlug]/agenda?date=` retourne
  **uniquement** `{ start, end, status: "RESERVED" | "UNAVAILABLE" }` — jamais
  les champs `customerId`, `title`, `note`, `service`, `price`, `staff`. Ne pas
  réutiliser tel quel `/api/appointments` (qui expose les données complètes
  pour le back-office) : soit un mapper strict de projection, soit une query
  Prisma dédiée avec `select` minimal pour éviter toute fuite de champ par
  erreur (ex: un futur champ ajouté à `Appointment` ne doit pas se retrouver
  exposé "par défaut").
- Les créneaux libres restent cliquables pour lancer directement le parcours
  de réservation (§3) pré-rempli avec l'horaire choisi.

### 3ter. Modification d'un RDV = demande soumise à validation admin
- Contrairement à l'annulation (directe, cf. §3), un client **ne peut jamais**
  modifier lui-même la date/heure d'un RDV existant. Il ne peut que **soumettre
  une demande de modification**, que le staff doit approuver ou refuser depuis
  le back-office. L'`Appointment` original reste inchangé tant que la demande
  n'est pas traitée.
- Nouveau modèle Prisma `AppointmentChangeRequest` :
  ```prisma
  model AppointmentChangeRequest {
    id               String       @id @default(cuid())
    appointmentId    String
    appointment      Appointment  @relation(fields: [appointmentId], references: [id])
    customerId       String
    customer         Customer     @relation(fields: [customerId], references: [id])
    organizationId   String
    organization     Organization @relation(fields: [organizationId], references: [id])
    requestedStart   DateTime
    requestedEnd     DateTime
    reason           String?
    status           String       @default("PENDING") // PENDING | APPROVED | REJECTED
    reviewedByUserId String?
    reviewedAt       DateTime?
    createdAt        DateTime     @default(now())
    updatedAt        DateTime     @updatedAt

    @@index([organizationId, status])
  }
  ```
  (ajouter les relations inverses nécessaires sur `Appointment`, `Customer`,
  `Organization`).
- Flux :
  1. Client (`/portail/[organizationSlug]/mes-rdv`) clique
     "Demander un changement" sur un RDV →
     choisit un nouveau créneau + motif optionnel → `POST
     /api/portail/rdv/[id]/demande-modification` crée un
     `AppointmentChangeRequest` en `PENDING`. **Aucune écriture sur
     `Appointment`** à cette étape.
  2. Back-office : nouvel écran/liste "Demandes de modification en attente"
     (badge de notification), avec actions **Approuver** / **Refuser**.
     - `POST /api/appointments/change-requests/[id]/approve` (staff only) :
       revérifie **à la fois** le conflit horaire avec les autres RDV du même
       `staffId` (`findFirstSchedulingConflict`) **et** les blocs
       `Unavailability` globales de l'organisation sur le nouveau créneau
       avant d'appliquer réellement le changement sur `Appointment`
       (transaction) ; passe la demande à `APPROVED`.
     - `POST /api/appointments/change-requests/[id]/reject` (staff only) :
       passe la demande à `REJECTED`, motif optionnel du staff.
  3. Le client voit le statut de sa demande (`PENDING`/`APPROVED`/`REJECTED`)
     dans `/portail/[organizationSlug]/mes-rdv`, avec notification (toast au
     prochain login, email en V2).
- Un client ne peut avoir qu'**une seule demande `PENDING`** à la fois par
  RDV (contrainte applicative, pas de spam de demandes).
- **Invalidation des demandes orphelines** : si le staff modifie directement
  (`PUT /api/appointments`) ou annule/supprime
  (`DELETE /api/appointments/[id]`) un `Appointment` qui a une
  `AppointmentChangeRequest` en `PENDING`, cette dernière doit être
  automatiquement basculée à `REJECTED` (motif système : "RDV modifié
  directement par l'organisation") **dans la même transaction** que
  l'opération back-office. Sans ce garde-fou, une demande `PENDING` pourrait
  être approuvée plus tard sur un RDV qui n'existe plus ou a déjà changé
  d'horaire.
- **Crédits de forfait (`CustomerPackage`)** :
  - Si l'`Appointment` d'origine était rattaché à un `CustomerPackage`
    (séance décomptée), l'**approbation** d'un changement de créneau ne doit
    **pas** re-décrémenter une seconde fois `sessionsRemaining` (c'est un
    déplacement, pas une nouvelle séance).
  - L'**annulation** directe par le client (§3) d'un RDV lié à un
    `CustomerPackage` doit **recréditer** `sessionsRemaining` (incrément
    atomique) uniquement si elle respecte le délai de plus de 24h ; après ce
    délai, le client ne peut pas annuler en ligne et aucun crédit n'est
    modifié. Règle à formaliser dans `src/domain/package/sessionCredit.ts`
    (fonction pure testée, appelée par le service d'annulation).

### 4. API (routes minces, Zod partout)
- `POST /api/portail/auth/request-code` (organizationSlug, email) : envoi OTP
  si une fiche client existe, avec réponse anti-énumération.
- `POST /api/portail/auth/verify-code` (organizationSlug, email, code) :
  validation à usage unique et ouverture d'une session limitée aux fiches
  ayant cette adresse email dans l'organisation. Aucun champ
  prénom/nom/téléphone n'est accepté de l'utilisateur public.
- `GET /api/portail/[organizationSlug]/services` : retourne uniquement les
  prestations proposées par l'organisation résolue depuis le slug.
- `GET /api/portail/[organizationSlug]/creneaux?serviceId=&staffId=&date=`
  (créneaux disponibles pour la prestation et, lorsque nécessaire, le
  praticien sélectionnés ; la durée est lue en base depuis `Service`).
- `GET /api/portail/[organizationSlug]/agenda?date=` (vue calendrier
  anonymisée, cf. §3bis).
- `GET /api/portail/rdv` (client authentifié) : retourne uniquement les RDV
  futurs non annulés des fiches reliées au couple
  `(session.organizationId, session.verifiedEmail)`, avec une projection
  explicite des champs nécessaires à l'écran "Mes RDV".
- `POST /api/portail/rdv` (création RDV pour une fiche choisie parmi celles
  reliées au couple `(session.organizationId, session.verifiedEmail)` ; le
  serveur valide cette appartenance, recharge le service et le staff depuis la
  base, cf. §4bis pour la garantie anti double-booking).
- `DELETE /api/portail/rdv/[id]` (annulation directe, vérifie que le RDV
  appartient à une fiche reliée au couple
  `(session.organizationId, session.verifiedEmail)`).
- `POST /api/portail/rdv/[id]/demande-modification` (cf. §3ter — ne modifie
  jamais le RDV directement).
- `POST /api/appointments/change-requests/[id]/approve` (staff only, cf. §3ter).
- `POST /api/appointments/change-requests/[id]/reject` (staff only, cf. §3ter).

### 4bis. Anti double-booking — garantie transactionnelle (durcissement)
- **Constat sur l'existant** : `src/domain/appointment/policies.ts` fournit
  déjà `hasSchedulingConflict`/`findFirstSchedulingConflict`, mais seule la
  route `PUT /api/appointments` (modification back-office) les utilise ; la
  création (`POST /api/appointments`) n'a **aucun** check de conflit
  aujourd'hui, et le check existant reste un pattern *lire-puis-écrire* non
  atomique (deux requêtes concurrentes peuvent toutes deux passer le check
  avant qu'aucune n'ait encore inséré).
- Acceptable en back-office (usage mono-admin), **insuffisant pour le portail
  public** où plusieurs clients peuvent cliquer "réserver" simultanément sur le
  même créneau.
- **Exigence commune à tout chemin d'écriture** : la même politique
  d'anti-chevauchement doit protéger `POST /api/portail/rdv`,
  `POST /api/appointments`, `PUT /api/appointments` et l'approbation des
  changements (`POST /api/appointments/change-requests/[id]/approve`).
  Une réservation client et une création/déplacement par le staff qui se
  produisent simultanément ne doivent pas pouvoir se chevaucher pour un même
  praticien. Tout mode de forçage éventuel reste réservé au back-office,
  explicitement autorisé et ne s'applique jamais au portail.
- Pour ces routes :
  1. Envelopper le check + la création/modification dans une transaction Prisma
     `$transaction(..., { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`.
  2. Relire les créneaux existants **dans** la transaction (pas avant), puis
     appliquer `findFirstSchedulingConflict` avant l'insert ou l'update.
  3. Sur erreur de sérialisation Postgres (code `40001`), retry automatique
     (1 à 2 tentatives) avant de renvoyer `409 Conflit horaire détecté` au
     client.
  4. (V2, optionnel) Contrainte d'exclusion Postgres native
     (`EXCLUDE USING gist (staffId WITH =, tsrange(startTime, endTime) WITH &&)`)
     via migration SQL brute, en filet de sécurité ultime indépendant de
     l'application.
- Pour l'approbation, le nouveau créneau doit être revérifié à l'instant T de
  l'approbation, pas au moment de la demande initiale qui peut être ancienne.

## 5. Garde-fous complémentaires

### 5.0 Activation du portail par organisation
- Cf. point 0 : `portalEnabled` désactivé par défaut. Écran
  `/settings/portail` (staff only) pour définir le `slug` et activer/désactiver
  le portail à tout moment. Désactivation immédiate = toutes les routes
  publiques renvoient `404` (pas de suppression de données).

### 5.1 Notification staff (temps réel minimal)
- Ajouter `Appointment.bookingSource String @default("STAFF")`
  (`STAFF | PORTAL`) pour distinguer une réservation client en ligne des RDV
  saisis par le staff ; migration avec valeur par défaut préservant les RDV
  existants (**Phase 1**). Le compteur utilise cette source pour les nouvelles
  réservations en ligne du jour.
- **Phase 1** : exposer un compteur simple de nouvelles réservations en ligne,
  rafraîchi via polling léger (ex: toutes les 30s sur la page agenda/dashboard).
- **Phase 3** : étendre ce compteur pour inclure les demandes de modification
  `PENDING`. Pas de WebSocket en V1, trop lourd pour le besoin.
- V2 (hors scope initial) : email de notification au staff à chaque nouvelle
  réservation/demande.

### 5.2 Anti no-show / réservations abusives
- Le client ne saisit ni ne modifie ses informations personnelles dans le
  portail ; email et téléphone sont gérés par le staff sur la fiche `Customer`.
- Aucun plafond du nombre de rendez-vous futurs par client en V1.
- Champ organisation optionnel `requireDepositForOnlineBooking: Boolean`
  (`Organization`) préparant le terrain pour un acompte/paiement en ligne
  (intégration Stripe ou équivalent) — **intégration paiement effective
  explicitement hors scope V1** (juste le flag et le point d'extension dans
  le domaine, pour ne pas bloquer une itération suivante).

### 5.3 Rate limiting élargi sur les demandes de modification
- Au-delà de la règle "1 demande `PENDING` par RDV" (§3ter), plafonner le
  nombre total de demandes de modification qu'un client authentifié peut créer
  sur une fenêtre glissante (**5 demandes / 24h**, tous RDV confondus),
  pour éviter le spam applicatif côté back-office. Réutilise le même
  mécanisme de rate limiting que `/api/portail/auth/request-code` et
  `/api/portail/auth/verify-code` (§ Sécurité), avec des clés distinctes pour
  éviter qu'un abus d'OTP ne consomme le quota des demandes de modification.

### 5.4 Fuseau horaire
- Toutes les dates `Appointment`/`Unavailability`/créneaux affichés sont
  stockées en UTC (comportement Prisma/Postgres par défaut) mais
  **interprétées et affichées dans le fuseau de l'organisation**
  (nouveau champ `Organization.timezone: String @default("Europe/Paris")`),
  pas celui du navigateur du client — un client réservant depuis un autre
  fuseau doit voir les créneaux à l'heure locale du commerce, pas la sienne,
  pour éviter tout quiproquo sur l'heure réelle du RDV. Utiliser une lib
  IANA-aware (`date-fns-tz` ou équivalent déjà présent dans les dépendances)
  côté conversion, jamais de calcul manuel d'offset.

### 5.5 RGPD — droit à l'oubli / export
- Le portail ne fournit pas de suppression autonome de fiche ni d'export en
  V1 : l'identité et les données du client sont gérées par le staff.
- Le processus de traitement des demandes RGPD (accès, rectification,
  effacement, conservation des rendez-vous) doit être défini avec le
  responsable de traitement/DPO avant d'ajouter des actions d'export ou de
  suppression. Ne pas anonymiser ni supprimer les historiques automatiquement
  sans règle métier/légale validée.

## 🛡️ Règles de Sécurité (Anti-IDOR)
- [ ] **Isolation stricte** : toute requête `Customer`/`Appointment` est
  filtrée par `organizationId` et limite les données aux fiches dont l'email
  est celui vérifié dans la session OTP. Toute fiche sélectionnée pour créer,
  annuler ou demander un changement doit être reliée à ce couple ; ne jamais
  faire confiance à un `customerId` client sans vérifier cette relation.
- [ ] Une session `CUSTOMER` ne doit avoir accès à **aucune** route/API du
  back-office (`/api/customers`, `/api/staff`, `/dashboard`, etc.) — garde par
  `accountType`.
- [ ] Les codes OTP ne sont jamais enregistrés en clair ni journalisés ;
  consommation atomique, expiration, nombre d'essais et rate limit appliqués
  côté serveur.
- [ ] Les réponses de demande d'OTP ne permettent pas de déterminer si une
  fiche `Customer` existe pour une adresse email donnée.
- [ ] Le portail ne crée/modifie jamais une fiche `Customer` : seules les
  fiches préexistantes sur lesquelles le staff a renseigné l'email vérifié
  peuvent être sélectionnées pour réserver ou consulter leurs rendez-vous.
- [ ] Rate limiting sur `/api/portail/auth/request-code` et
  `/api/portail/auth/verify-code` : maximum 3 emails OTP par adresse sur 15
  minutes, 10 demandes par IP sur une heure et 5 essais par code.
- [ ] Validation Zod stricte des créneaux côté serveur pour empêcher le
  double-booking, **au sein d'une transaction Serializable** (cf. §4bis) —
  revérification du conflit au moment de l'insertion et de l'approbation
  d'une demande de modification, pas seulement à l'affichage.
- [ ] **Aucune modification directe de RDV par le client** : la route
  `POST /api/portail/rdv/[id]/demande-modification` ne doit jamais écrire sur
  `Appointment`, uniquement créer un `AppointmentChangeRequest` en `PENDING`.
  Seules les routes `approve`/`reject` (protégées par session **staff**,
  vérification `role`/`accountType === "STAFF"` + `organizationId`) peuvent
  modifier l'`Appointment`.
- [ ] **Anonymisation de l'agenda (§3bis)** : la réponse de
  `GET /api/portail/[organizationSlug]/agenda` ne doit jamais contenir
  `customerId`, nom/prénom, `note`, `service`, `price`/`finalPrice`, `staffId`.
  Test dédié : sérialiser la réponse JSON et vérifier l'absence de ces clés
  (pas seulement masquer côté UI).

## 📱 Expérience Utilisateur (UX)
- Mobile first (le parcours client se fait majoritairement depuis un
  smartphone).
- Connexion sans mot de passe par code OTP email ; le navigateur peut proposer
  de remplir le code, mais l'interface doit rester utilisable sans
  autoremplissage.
- Formulaire de réservation en 3 étapes max (Service → Créneau → Confirmation),
  avec état de chargement clair.
- Après création effective du RDV, envoyer au client un email de confirmation
  via Resend (déjà utilisé par le dépôt) avec prestation, date, heure locale de
  l'organisation, durée et coordonnées de l'organisation disponibles.
- Joindre un fichier calendrier `.ics` (ou un lien sécurisé de téléchargement)
  construit depuis le RDV persisté, avec `DTSTART`/`DTEND` corrects dans le
  fuseau de l'organisation, identifiant d'événement stable et lien vers le
  portail. Ne jamais inclure de données d'un autre client dans l'événement.
  L'utilisateur pourra l'ajouter à Apple Calendar, Google Calendar, Outlook ou
  un autre agenda compatible.
- Envoyer l'email **après** la réussite de la transaction de réservation.
  Un échec d'email ne doit ni annuler le rendez-vous ni afficher que la
  réservation a échoué ; signaler l'indisponibilité de l'email de confirmation
  et permettre une nouvelle tentative/réémission sans créer de doublon de RDV.

## ✅ Décisions actées pour la V1
- Pas de configuration hebdomadaire : utiliser les heures globales chaque
  jour, avec rendez-vous et indisponibilités existants comme blocages.
- Réutiliser Resend déjà présent dans le dépôt pour OTP et confirmations.
- Seules les fiches `Customer` préalablement créées et gérées par le staff
  peuvent accéder au portail via OTP email.
- Annulation client autorisée à plus de 24 heures ; à 24 heures ou moins,
  contacter le staff.
- Quotas OTP : 3 envois par adresse sur 15 minutes, 10 demandes par IP/heure
  et 5 essais par code.
- Chaque praticien de l'organisation peut réaliser chaque prestation ; les
  spécialités/configurations Staff–Service sont reportées à une évolution
  ultérieure.
- Pas de plafond de rendez-vous futurs par client en V1.

## 🪜 Phasage proposé pour livrer progressivement

### Phase 1 — Réservation en ligne de bout en bout (MVP)
- Spec d'implémentation : [customer-portal-phase-1.md](customer-portal-phase-1.md).
- Configuration minimale du portail par organisation : slug public,
  activation/désactivation et timezone.
- Email de contact portail sur les fiches `Customer`, administré par le staff ;
  possibilité d'associer le même email à plusieurs fiches pour le parcours
  parent/enfant.
- OTP email sécurisé et session client isolée, puis sélection de la fiche
  concernée lorsqu'un email est lié à plusieurs personnes.
- Consultation des prestations, vue agenda anonymisée et créneaux calculés
  depuis la durée réelle du service, les heures d'ouverture, les rendez-vous et
  les indisponibilités existantes.
- Création fiable du RDV sans chevauchement, y compris face à une création ou
  modification concurrente du staff ; email de confirmation avec événement
  `.ics`.
- Identifier les RDV créés par le portail (`Appointment.bookingSource`) et
  fournir au staff un compteur simple des nouvelles réservations en ligne
  aujourd'hui.
- Cette phase comprend les migrations, guards, rate limits, règles
  d'organisation et tests nécessaires à une exposition publique sûre. Pas de
  réservation publique avant que tous ces contrôles soient en place.

### Phase 2 — « Mes rendez-vous » et annulation autonome
- Spec d'implémentation : [customer-portal-phase-2.md](customer-portal-phase-2.md).
- Lister les futurs RDV non annulés des fiches liées à l'email OTP et permettre
  de distinguer les rendez-vous de chaque membre de la famille.
- Annulation client autorisée à plus de 24h, refusée côté serveur à 24h ou
  moins avec invitation à contacter le staff.
- Recrédit atomique des séances `CustomerPackage` lorsque l'annulation est
  autorisée.

### Phase 3 — Demandes de changement validées par le staff
- Spec d'implémentation : [customer-portal-phase-3.md](customer-portal-phase-3.md).
- Le client demande un nouveau créneau, mais le RDV reste inchangé jusqu'à la
  décision du staff.
- Écran staff pour approuver/refuser, revalidation du créneau et des
  indisponibilités dans une transaction, invalidation des demandes devenues
  obsolètes et limite de 5 demandes par client sur 24h.
- Étendre le compteur/polling staff existant pour inclure les demandes de
  modification `PENDING`.

### Hors de ces premières phases
- Acompte/paiement en ligne, associations de spécialités `Staff`–`Service`,
  indisponibilités par praticien, planning hebdomadaire, SMS et fonctionnalités
  d'export/suppression RGPD restent des évolutions ultérieures à spécifier.

## 🧪 Protocole de Test (Definition of Done)
1. Un client dont l'email figure sur au moins une fiche créée par le staff peut
   demander un OTP email, consulter les rendez-vous de ces fiches après
   vérification et se reconnecter plus tard par un nouvel OTP. Une adresse sans
   fiche ne peut pas ouvrir de session ni réserver.
2. `GET /api/portail/rdv` retourne uniquement les RDV futurs non annulés des
   fiches reliées à l'email et l'organisation de la session OTP ; aucun
   paramètre client ne peut élargir ce périmètre ni révéler les RDV d'autres
   fiches.
3. Un client choisit une prestation ; le serveur calcule l'heure de fin depuis
   sa durée stockée et ne propose que les créneaux sans chevauchement avec les
   RDV actifs ou indisponibilités du praticien. Après réservation, le créneau
   devient indisponible immédiatement. Des tentatives simultanées de
   réservation par un client et de création/déplacement par le staff ne
   peuvent pas produire de chevauchement pour le même praticien.
4. Si une adresse email est renseignée sur plusieurs fiches (par exemple mère
   et fils), la session OTP voit leurs rendez-vous, le parcours demande
   « Pour qui est le rendez-vous ? », et le rendez-vous créé est lié à la fiche
   sélectionnée. Cette session ne peut ni voir ni réserver pour une fiche qui
   n'a pas cette adresse email dans la même organisation.
5. Après une réservation confirmée, le client reçoit un email contenant la
   prestation, la date et l'heure locale, avec un événement `.ics` dont le
   début et la fin correspondent exactement au rendez-vous dans le fuseau de
   l'organisation. Un échec d'envoi ne crée pas de seconde réservation lors
   d'une nouvelle tentative.
6. Un client peut annuler un RDV dans les règles autorisées, et ne peut pas
   annuler un RDV d'une autre organisation/customer. L'annulation directe est
   permise uniquement si le RDV est à plus de 24h (heure de l'organisation) ;
   à 24h ou moins, l'API la refuse et l'interface invite à contacter le staff.
7. Une session `CUSTOMER` ne peut atteindre aucune route back-office
   (`/dashboard`, `/api/customers`, etc.).
8. Sur la vue agenda (§3bis), les créneaux occupés affichent "Réservé" sans
   aucune donnée personnelle (nom, service, prix, note) — vérifié à la fois en
   E2E (UI) et par un test d'intégration sur le payload JSON de
   `/api/portail/[organizationSlug]/agenda`.
9. Deux clients qui réservent le même créneau en simultané (test de
   concurrence, requêtes parallèles) : un seul obtient le RDV, l'autre reçoit
   `409 Conflit horaire détecté` — jamais de double insertion en base.
10. Un client qui demande un changement de créneau ne voit **aucun impact
   immédiat** sur son RDV (l'horaire d'origine reste affiché/actif) tant que le
   staff n'a pas approuvé la demande ; un appel direct à une route de
   modification de RDV avec un compte `CUSTOMER` est rejeté (403).
11. Après approbation d'une demande par le staff, le nouveau créneau est
   appliqué et un conflit avec un RDV créé entre-temps sur ce créneau est
   détecté et bloque l'approbation (409).
12. Deux réservations à la même heure chez deux `Staff` différents de la même
    organisation ne sont **jamais** bloquées l'une par l'autre (conflit
    évalué par `staffId`). Le sélecteur de praticien est masqué quand
    l'organisation n'a qu'un seul `Staff`.
13. Si le staff modifie ou annule directement un RDV ayant une demande de
    modification `PENDING`, celle-ci passe automatiquement à `REJECTED`
    (motif système) — une approbation ultérieure sur cette demande est
    impossible.
14. L'approbation d'une demande de modification vérifie les `Unavailability`
    globales de l'organisation sur le nouveau créneau (pas seulement les
    autres RDV) et est bloquée si l'organisation est indisponible.
15. Annuler un RDV lié à un `CustomerPackage` recrédite `sessionsRemaining` ;
    approuver un simple changement d'horaire sur ce même RDV ne décrémente
    pas une seconde fois.
16. Un client n'est pas limité sur le nombre de RDV futurs en V1, mais ne peut
    pas dépasser le quota de demandes de modification sur 24h (429 explicite
    au-delà).
17. Un portail avec `portalEnabled: false` ou un `slug` inconnu renvoie `404`
    sur toutes les routes `/portail/*` et `/api/portail/*` (pas de fuite
    d'existence de l'organisation).
18. Une adresse email peut être associée à plusieurs fiches de la même
    organisation et à des fiches dans plusieurs organisations. L'OTP donne
    accès uniquement aux fiches associées à l'adresse pour l'organisation du
    `slug`.
19. Un OTP email expiré, déjà consommé ou dépassant le nombre d'essais est
    refusé ; un OTP renvoyé invalide l'ancien et les réponses de demande de code
    ne révèlent pas si le compte existe.
20. Un créneau affiché à 14h dans le portail correspond bien à 14h **heure de
    l'organisation** (`Organization.timezone`), quel que soit le fuseau du
    navigateur du client testé.
21. Une réservation créée depuis le portail porte `bookingSource: "PORTAL"`,
    une réservation créée par le staff conserve `"STAFF"`, et le compteur
    staff distingue correctement les réservations en ligne du jour.
