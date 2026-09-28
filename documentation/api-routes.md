# Routes API (`src/app/api/`)

Toutes les routes (sauf `auth/*`) suivent le même socle : `const session = await auth()`,
rejet `401 Unauthorized` si absent, `403 Forbidden` si pas d'`organizationId`, puis toute
requête Prisma est filtrée par cet `organizationId` (isolation multi-tenant / anti-IDOR — voir
`technique.md` §5). Les corps de requête sont validés par un schéma **Zod** dédié
(`src/schemas/`) avant tout accès base de données.

## Rendez-vous

### `GET/POST/PUT/DELETE /api/appointments`
- **GET** `?start&end` (ISO 8601 avec offset) : liste des rendez-vous de l'organisation sur la
  période, au format attendu par FullCalendar (`title`, `start`, `end`, `color`,
  `extendedProps`...). Parse les champs JSON legacy `extras`/`soldProducts`.
- **POST** : crée un rendez-vous (`CreateAppointmentSchema`). Va chercher le prix du service
  au moment de la création. Si `customerPackageId` fourni, décrémente atomiquement
  `sessionsRemaining` du forfait (garde `sessionsRemaining: { gt: 0 }` — voir
  `src/domain/package/sessionCredit.ts`).
- **PUT** : modifie un rendez-vous existant (`UpdateAppointmentSchema`). Détecte un conflit
  horaire avec un autre rendez-vous du même membre du staff (`src/domain/appointment/policies.ts`,
  fenêtre de recherche ±24h) sauf si `force: true`. Retourne `409` en cas de conflit,
  `404` si le rendez-vous n'existe pas/plus (anti-IDOR ou race condition).
- **DELETE** `?id&from&confirm` (ou body JSON équivalent) : refuse la suppression d'un
  rendez-vous payé (`canDeleteAppointment`). Exige `confirm: true` si l'origine est
  `from=checkout`.

### `POST /api/appointments/[id]/checkout`
Clôture un rendez-vous (encaissement) : transaction Prisma atomique qui (1) décrémente le
stock de chaque produit vendu (`Product.stock`, erreur `409 Stock insuffisant` si stock
insuffisant), (2) passe le rendez-vous en `status: "PAID"` avec `finalPrice`, `extras`,
`soldProducts`, `note`, `paymentMethod`. Payload validé par `CheckoutInputSchema`.

## Clients

### `GET/POST/PUT /api/customers`
- **GET** : `?id=<cuid>` → fiche client détaillée avec historique des rendez-vous ; sans
  paramètre → liste des clients de l'organisation (avec date du dernier rendez-vous).
- **POST** : crée un client (`CustomerCreateSchema`). Refuse un doublon de téléphone au sein
  de l'organisation (`409`).
- **PUT** : met à jour un client (`CustomerUpdateSchema`), mise à jour scopée par
  `organizationId` (`updateMany` — retourne `404` si 0 ligne modifiée).

### `GET/POST /api/customers/[id]/packages`
- **GET** `?serviceId=<id>` (optionnel) : liste les forfaits **utilisables** du client
  (`canConsumeSession` — au moins une séance restante — et non expirés), filtrés par service
  compatible si `serviceId` fourni.
- **POST** : crée un `CustomerPackage` (achat d'un forfait) pour le client, avec vérification
  de propriété (`customer` et `package` doivent appartenir à l'organisation).

## Catalogue

### `GET /api/catalog`
Vue combinée services + produits de l'organisation (utilisée par les sélecteurs génériques),
triée par nom.

### `GET/POST /api/services`, `GET/POST /api/products`
CRUD complet pour les prestations (`Service`) et les produits (`Product`) du catalogue.
`PUT`/`DELETE` vérifient systématiquement que l'entité appartient à l'organisation avant
modification/suppression (anti-IDOR).

### `GET/POST /api/packages`
Liste / création des **modèles de forfaits** (`Package`, ex. "Carte 10 séances"), avec leurs
prestations associées (`packageServices`). À distinguer de `CustomerPackage` (l'instance
achetée par un client).

## Staff

### `GET /api/staff`
Liste des membres du staff de l'organisation, formatée en ressources FullCalendar
(`{ id, title }`).

## Indisponibilités

### `GET/POST/DELETE /api/unavailability`
- **GET** `?start&end` : indisponibilités (congés, blocages) chevauchant la période, formatées
  pour l'agenda (bloc gris, non comptabilisé au CA).
- **POST** : crée une ou plusieurs occurrences selon la récurrence choisie (`NONE`, `WEEKLY`,
  `BIWEEKLY`, `MONTHLY` — voir `src/services/unavailability.service.ts::buildOccurrences`).
  Les occurrences d'une même série partagent un `recurrenceGroupId`.
- **DELETE** `?id&deleteAll` : supprime une occurrence, ou toute la série récurrente si
  `deleteAll=1`.

## Dashboard / Statistiques

### `GET /api/dashboard/summary`, `GET /api/stats`, `GET /api/stats/dashboard`
Trois endpoints quasi équivalents (legacy — non unifiés) qui appellent tous
`getDashboardForOrg()` (`src/services/dashboard.service.ts`) avec une plage `start`/`end` en
query params. `dashboard/summary` accepte en plus un mode test (`x-test-api-key` +
`TEST_API_KEY`, hors production) permettant d'interroger un `orgId` arbitraire sans session —
réservé aux tests automatisés.

## Organisation

### `GET/PATCH /api/organization/settings`
Paramètres de l'organisation : objectif de CA journalier (`dailyTarget`), horaires d'ouverture
(`openingTime`/`closingTime`, format `HH:MM`). Gère un **fallback de compatibilité** : si les
colonnes `openingTime`/`closingTime` n'existent pas encore en base (migration non appliquée),
retombe sur des valeurs par défaut (`08:00`/`20:00`) plutôt que de faire échouer la requête.

## Utilisateurs

### `GET/POST /api/users`
Réservé aux utilisateurs `role: 'ADMIN'`. Liste / crée des comptes utilisateurs au sein de
l'organisation (mot de passe haché avec `bcryptjs`, `BCRYPT_ROUNDS`).

## Authentification

### `[...nextauth]` (Auth.js/NextAuth)
Handler standard NextAuth (configuration dans `src/auth.ts` / `src/lib/nextAuthOptions.ts`).

### `POST /api/auth/forgot-password`
Génère un token de réinitialisation (`crypto.randomBytes(32)`, expire après 1h) et envoie un
email via **Resend** (`RESEND_API_KEY` requis). Ne révèle jamais si l'email existe ou non
(réponse `{ ok: true }` dans tous les cas) — contre l'énumération de comptes.

### `POST /api/auth/reset-password`
Vérifie le token (existence + non-expiration), met à jour le mot de passe (haché), supprime
le token (usage unique).

## Routes de test (non-production)

### `POST /api/test/create-billing-test-data`
Crée un jeu de données minimal (organisation, service, produit, client, rendez-vous payé) pour
les tests E2E de facturation. **Toujours indisponible en production** (`404`) et protégée par
`x-test-api-key` == `TEST_API_KEY` sinon.

## Conventions communes

- Réponses d'erreur : `{ error: string, details?: ... }` avec code HTTP approprié
  (`400` validation, `401` non authentifié, `403` pas d'organisation, `404` non trouvé/anti-IDOR,
  `409` conflit métier, `500` erreur serveur via `apiErrorResponse()` — `src/lib/api.ts`).
- Les identifiants sont des CUID (`cuid()` Prisma) ; les schémas Zod valident ce format quand
  pertinent (ex. `z.string().cuid()`).
- Toute règle métier avec branchement conditionnel doit être déléguée à `src/domain/` (voir
  `technique.md` §4) plutôt qu'inlinée dans le `route.ts`.
