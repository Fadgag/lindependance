# Documentation technique

## 1. Stack

- **Framework** : Next.js (App Router), React, TypeScript.
- **Base de données** : PostgreSQL, via **Prisma ORM** (`prisma/schema.prisma`).
  Hébergement recommandé : [Neon](https://neon.tech) (pooler de connexions).
- **Authentification** : [Auth.js / NextAuth](https://authjs.dev) avec adapter Prisma
  (`src/lib/nextAuthAdapter.ts`, `src/lib/nextAuthOptions.ts`, `src/auth.ts`).
- **Validation** : [Zod](https://zod.dev) (`src/schemas/`).
- **UI** : Tailwind CSS, `lucide-react` (icônes), `framer-motion` (animations),
  `@fullcalendar/*` (agenda), `recharts` (graphiques dashboard), `sonner` (notifications toast).
- **Précision monétaire** : [`decimal.js`](https://github.com/MikeMcl/decimal.js) pour les
  agrégations financières (évite les erreurs d'arrondi binaire du `number` JS).
- **Tests** : [Vitest](https://vitest.dev) (unitaire/intégration) + [Playwright](https://playwright.dev) (E2E).
- **Gestionnaire de paquets** : `pnpm` (voir `.npmrc`, `pnpm-lock.yaml`).

## 2. Structure du dépôt

```
src/
  app/                  Routes Next.js (App Router)
    api/**/route.ts     Endpoints HTTP (auth + parsing + orchestration, PAS de règle métier)
    agenda/, customers/, dashboard/, auth/, (dashboard)/settings/   Pages UI
  domain/               Règles métier pures (DDD léger) — voir §4
  services/             Couche de persistance (accès Prisma), appelée par les routes/domaine
  components/           Composants React (UI)
  hooks/                Hooks React réutilisables (état de formulaires, données client, etc.)
  schemas/              Schémas de validation Zod (entrée API)
  types/                Types/interfaces partagés (Prisma-derived + DTOs)
  lib/                  Utilitaires transverses (Prisma client, dates, logger, crypto, timeout...)
  actions/              Server Actions Next.js
  auth.ts, proxy.ts      Configuration Auth.js et proxy d'isolation multi-organisation
prisma/
  schema.prisma         Modèle de données
  migrations/           Historique des migrations SQL
  seed.ts, scripts/     Données de test / scripts de maintenance ponctuels
test/                   Tests Vitest (miroir de `src/`, ex. `test/domain/**`)
tests/, test/e2e/       Tests Playwright (E2E)
specs/                  Spécifications fonctionnelles et backlog produit
documentation/          Ce dossier
```

Le seed Prisma initialise l'organisation locale sans identifiants prédéfinis. Pour créer un
compte administrateur local, définir `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` et
`SEED_ADMIN_PASSWORD` (16 caractères minimum) ; le seed refuse une base distante ou
`NODE_ENV=production` et ne modifie jamais un compte existant. Pour une base distante,
utiliser la procédure de bootstrap vérifiée `pnpm create-admin`.

## 3. Modèle de données (résumé)

Entités principales (`prisma/schema.prisma`) : `Organization`, `User` (+ `Account`, `Session`,
`VerificationToken`, `PasswordResetToken` pour Auth.js), `Staff`, `Customer`, `Service`,
`Product`, `Package` / `PackageService` / `CustomerPackage`, `Appointment`, `Unavailability`.

Points clés :
- Isolation multi-tenant : toutes les entités métier portent un `organizationId`.
- `Appointment.status` : `CONFIRMED` (défaut), `PAID`, `CANCELLED` (legacy : `PAYED`).
- `Appointment.extras` / `soldProducts` : JSON sérialisé (compat legacy) — voir
  `src/lib/parseAppointmentJson.ts`. Une colonne `soldProductsJson` (JSON natif) existe pour
  une migration progressive.
- Index `@@index([organizationId, startTime])` sur `Appointment` : utilisé par les requêtes
  de conflit horaire et d'agrégation dashboard.

## 4. Architecture applicative — DDD léger

Le projet applique une architecture en couches pragmatique (pas de DDD tactique complet —
pas d'agrégats stricts, pas de repository pattern abstrait, jugé disproportionné pour la
taille du domaine). Convention (voir aussi `src/domain/README.md`, `AGENTS.md`, `CLAUDE.md`) :

| Couche | Rôle | Dépendances autorisées |
|---|---|---|
| `src/app/api/**/route.ts` | Auth, parsing Zod, orchestration HTTP | Next.js, `domain/`, `services/` |
| `src/domain/<sous-domaine>/` | Règles métier pures (calculs, policies) | Aucune (pas de Next/Prisma/React) |
| `src/services/` | Persistance (accès Prisma) | Prisma |

Sous-domaines existants :
- `src/domain/billing/vat.ts` — calcul de TVA sur montants TTC (`computeVatFromTtc`,
  `computeSoldProductLine`, `computeCheckoutTotal`). L'encaissement recalcule le total
  depuis les tarifs du service et des produits persistés ; les suppléments libres sont
  réservés aux comptes `ADMIN`.
- `src/domain/appointment/policies.ts` — `isAppointmentPaid` et `canDeleteAppointment`
  (règles de paiement/suppression), `hasSchedulingConflict` / `findFirstSchedulingConflict`
  (détection de chevauchement horaire).
- `src/domain/package/sessionCredit.ts` — `canConsumeSession` / `consumeSession` (règle de
  crédit de séances d'un forfait client).

**Règle de contribution** : toute nouvelle règle métier avec une condition (`if`) va dans
`src/domain/`, testée en unitaire sans mock Prisma. Les endpoints `route.ts` restent minces.
Exception assumée : les gardes nécessitant une **atomicité DB** (ex. décrément concurrentiel
d'un compteur) restent implémentées en clause Prisma (`updateMany` avec condition `WHERE`),
documentées en commentaire renvoyant vers la règle du domaine équivalente — les remplacer par
un `fetch` + vérification applicative réintroduirait des races conditions.

## 5. Isolation multi-organisation (sécurité)

- Chaque route API vérifie la session (`auth()`) et récupère `session.user.organizationId`.
- Toute requête Prisma sur une entité métier est filtrée par cet `organizationId` (garde
  "anti-IDOR" : un utilisateur ne peut jamais lire/modifier les données d'une autre
  organisation, même en devinant un identifiant).
- Un proxy applicatif (`src/proxy.ts`) injecte un header `x-org-id` pour les handlers en aval
  (voir configuration `NEXT_PROXY_INJECTION_MODE` dans `README.md`).

## 6. Tests

- **Unitaires / intégration** (Vitest, `pnpm test` / `npx vitest run`) :
  - `test/domain/**` : règles métier pures, sans mock (rapides, exhaustifs sur les cas limites).
  - `test/api/**` : handlers de route avec Prisma et `auth()` mockés.
  - `test/lib/**`, `test/stats/**`, `test/ui/**` : utilitaires, agrégations dashboard,
    composants React (Testing Library).
- **E2E** (Playwright, config `playwright.config.js`, specs dans `tests/e2e/`) : parcours
  utilisateur bout-en-bout sur une instance démarrée (`BASE_URL`, défaut
  `http://localhost:3000`). Pas de script `npm run` dédié actuellement — invoquer directement
  `npx playwright test`.
- Avant de livrer une modification : `npx tsc --noEmit`, `npx vitest run`, `npx eslint <fichiers modifiés>`.

## 7. Qualité et automatisation

- `quality/` : rapports d'audit et de review générés par les skills `reviewer.skill.md` /
  `auto-fixer.skill.md` (voir `AGENTS.md` / `CLAUDE.md` pour les commandes `/review`,
  `/autofixer`, `/build`).
- Hooks Git (`husky`) :
  - `pre-commit` : `npx tsc --noEmit` (type-check complet avant chaque commit).
  - `pre-push` : bloque tout push direct sur `main`/`master` (travailler sur une branche +
    PR, cohérent avec les conventions `AGENTS.md`/`CLAUDE.md`).
