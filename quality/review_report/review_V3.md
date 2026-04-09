# 🧪 Next.js Code Review Report - V3

**Date :** 2026-04-01
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Audit post-AutoFixer — état courant du code source

---

## 🧾 Summary

- **Score :** 82/100
- **Verdict :** ⚠️ CHANGES REQUIRED
- **Stats :** Critical: 0 | Major: 3 | Minor: 7

---

## 🔴 Critical Issues (Blocking)

### Aucune
Toutes les issues critiques identifiées en V1 ont été corrigées :
- ✅ Middleware Next.js (`src/middleware.ts`) correctement nommé et chargé.
- ✅ IDOR dans `createAppointmentAction` supprimé (service scoppé par `organizationId`).
- ✅ Tests Vitest : 5/5 passés.

---

## 🟠 Major Issues

### [TYPES] `src/lib/nextAuthAdapter.ts` — 3 violations `any` + import module manquant

**Fichiers :** `src/lib/nextAuthAdapter.ts`, lignes 5, 11, 14, 26
**Problem :**
1. `import type { Request } from 'node-fetch'` — module `node-fetch` n'est pas installé → erreur TS2307 bloquante au build. L'import n'est pas utilisé.
2. Lignes 11 et 26 : casts `(m as any)?.getToken` et `(m as any)?.getServerSession` — violation du standard zéro-`any`.
3. Ligne 14 : `req: req as any` — violation identique.
4. Export default anonyme (ligne 37) — violation ESLint `import/no-anonymous-default-export`.

**Fix :**
```typescript
// Supprimer l'import node-fetch (L5)
// Typer les imports dynamiques comme unknown puis narrow
const m = await import('next-auth/jwt') as unknown
const getToken = (m as Record<string, unknown>)['getToken']
if (typeof getToken !== 'function') return null
const token = await (getToken as (opts: { req: unknown; secret?: string }) => Promise<unknown>)(
  { req, secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET }
)
// Nommer l'export default
const nextAuthAdapter = { getTokenFromRequest, getTypedServerSession }
export default nextAuthAdapter
```

---

### [TYPES] `src/middleware.ts` — 3 casts `any` persistants dans la logique orgId

**Fichier :** `src/middleware.ts`, lignes 8, 15–16, 63
**Problem :**
- `let auth: (h: (req: any) => any) => (req: any) => any` — fallback wrapper sur `any`.
- `orgIdFromAdapter = (session as any).organizationId … (token as any).organizationId` — les types `Record<string, unknown>` sont déjà corrects, il suffit d'accéder via la clé string : `session['organizationId']`.

**Fix :**
```typescript
// Ligne 63 — remplacer les casts `as any` par accès via Record<string, unknown>
const orgIdFromAdapter =
  (session && session['organizationId'] != null ? String(session['organizationId']) : null) ??
  (token && token['organizationId'] != null ? String(token['organizationId']) : null) ?? null
```

---

### [LOGS] Consoles `console.error` orphelins dans les routes API

**Fichiers :** `src/app/api/packages/route.ts` (L25, L41), `src/lib/api.ts` (L6), `src/app/actions/appointments.ts` (L75)
**Problem :** Ces appels directs à `console.error`/`console.warn` contournent le `logger` centralisé (`src/lib/logger.ts`). En production, cela rend le logging incohérent et empêche la collecte structurée des erreurs.
**Violation :** `global-rules.md` — "Pas de Logs de Debug : Supprimer tous les `console.log` avant de finaliser."
**Fix :** Remplacer par `logger.error(...)` / `logger.warn(...)` depuis `@/lib/logger`.

---

## 🟡 Minor Issues

- **`src/app/api/packages/route.ts` (L8) :** Import `{ z }` de Zod déclaré mais inutilisé. Supprimer.
- **`src/app/api/appointments/route.ts` (L6) :** Import `{ z }` de Zod déclaré mais inutilisé. Supprimer.
- **`src/app/api/users/route.ts` (L18) :** Paramètre `req` non utilisé dans `GET(req: Request)`. Renommer en `_req` ou `_request`.
- **`src/app/actions/appointments.ts` (L1) :** Import `'../../lib/prisma'` peut être raccourci en `'@/lib/prisma'`.
- **`src/app/actions/appointments.ts` (L31) :** `typeof duration === 'number'` redondant (Zod garantit déjà `number`). Simplifier : `const dur = Number.isFinite(duration) ? duration : service.durationMinutes`.
- **`src/auth.ts` (L6) :** `signIn` et `signOut` exportés mais inutilisés dans le projet actuel. Non bloquant, mais génère des warnings IDE. Soit les laisser (ils peuvent être utiles côté client), soit documenter l'intention.
- **`src/lib/nextAuthAdapter.ts` (L17, L31) :** Paramètre `e` capturé dans `catch (e)` mais inutilisé. Écrire `catch` sans paramètre ou `catch (_e)`.

---

## 🧠 Global Recommendations

1. **`src/lib/nextAuthAdapter.ts`** est devenu le point critique de qualité — 4 violations actives. Corriger en priorité pour atteindre 0% `any` et supprimer l'import manquant.
2. **Couche `src/services/`** : `analytics.service.ts` est créé et utilisé. Ajouter un test Vitest unitaire (TDD) qui vérifie que `getOrgStats` retourne `{ totalRevenue: 0, appointmentsCount: 0 }` pour une organisation sans données.
3. **Tests E2E manquants** : la spec `dashboard.md` exige un test Playwright multi-tenant (isoler les données de l'Org A vs Org B). Aucun test de ce type n'existe encore.
4. **Schéma Prisma** : `Customer` n'a pas de champ `createdAt`. Si la spec l'exige pour le comptage mensuel des nouveaux clients, ajouter ce champ et une migration. Actuellement `analytics.service.ts` retourne le total des clients (workaround documenté).
5. **Performances** : `analytics.service.ts` charge tous les `Appointment` + `Service` en mémoire pour calculer le CA. Envisager de stocker `price` sur `Appointment` au moment de la création pour permettre `prisma.appointment.aggregate({ _sum: { price: true } })`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Types/Imports bloquants :**
   - Corriger `src/lib/nextAuthAdapter.ts` : supprimer import `node-fetch`, éliminer `any`, nommer l'export default.
   - Corriger `src/middleware.ts` L63 : remplacer `as any` par accès via `Record<string, unknown>['key']`.

2. **Priorité 2 — Clean Code :**
   - Remplacer `console.error`/`console.warn` orphelins par `logger.error`/`logger.warn` dans `packages/route.ts`, `api.ts`, `actions/appointments.ts`.
   - Supprimer imports `z` inutilisés dans `appointments/route.ts` et `packages/route.ts`.
   - Raccourcir l'import prisma dans `actions/appointments.ts`.
   - Simplifier le `typeof` redondant dans `actions/appointments.ts`.

3. **Priorité 3 — Tests :**
   - Ajouter test unitaire `test/analytics.spec.ts` pour `getOrgStats`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED**

Le projet est fonctionnel et sécurisé (zéro Critical). Les 3 issues Major sont concentrées sur la qualité du code (typage et logging). Le score 82/100 peut atteindre 95+/100 après les corrections du plan ci-dessus. Tests actuels : ✅ 5/5 passés.

