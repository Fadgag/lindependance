# 🧪 Next.js Code Review Report - V1

**Date :** 2026-04-01
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Intégralité du code source post-migration Auth.js v5

---

## 🧾 Summary

- **Score:** 0/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 3 | Major: 5 | Minor: 4

---

## 🔴 Critical Issues (Blocking)

### [SÉCURITÉ] Middleware Next.js jamais exécuté — Toutes les routes sont publiques

**Fichier :** `src/proxy.ts`
**Violation :** Next.js 13+ (App Router) charge UNIQUEMENT `src/middleware.ts` ou `middleware.ts` à la racine. Un fichier nommé `proxy.ts` est invisible pour le framework.
**Impact :** La protection de l'ensemble des routes protégées est **non-opérationnelle**. N'importe quel utilisateur non authentifié peut accéder à `/agenda`, `/customers`, `/stats`, etc. sans token valide. Faille de sécurité totale en production.
**Fix :** Renommer `src/proxy.ts` → `src/middleware.ts`. Le contenu est fonctionnel, seul le nom de fichier est incorrect.

---

### [IDOR] `actions/appointments.ts` — `service.findUnique` sans scope `organizationId`

**Fichier :** `src/app/actions/appointments.ts`, ligne 27
**Violation :** `global-rules.md` — "Aucune donnée ne doit être lue ou écrite sans vérifier l'appartenance à `session.organizationId`."
**Code problématique :**
```typescript
// ❌ Pas de filtre organizationId
const service = await prisma.service.findUnique({ where: { id: serviceId } })
```
**Impact :** Un attaquant authentifié dans `Org A` peut fournir un `serviceId` appartenant à `Org B`. Le RDV est créé dans son org, mais avec les données métier (prix, nom, durée) de l'autre organisation. Fuite de données inter-organisation.
**Fix :**
```typescript
// ✅ Scoper par organizationId
const service = await prisma.service.findFirst({
  where: { id: serviceId, organizationId: orgId }
})
```

---

### [TESTS] `test/proxy.spec.ts` — Import cassé sur une export inexistante

**Fichier :** `test/proxy.spec.ts`, ligne 18
**Violation :** `global-rules.md` — "Intégrité des Tests : Non-Régression". La migration vers Auth.js v5 a cassé ce test sans le corriger.
**Code problématique :**
```typescript
import { middleware } from '../src/proxy'
// ❌ src/proxy.ts n'exporte pas de named export "middleware".
// Il exporte "default" (la fonction auth wrappée) et "config".
```
**Impact :** Ce test échoue à l'import. La suite de tests entière est considérée en erreur. La régression introduite par la migration n'a pas été détectée.
**Fix :** Soit (a) adapter le test pour importer `default`, soit (b) exporter explicitement `export const middleware = auth(...)` dans `src/proxy.ts` (ou `middleware.ts`). Le test lui-même est cohérent avec son intention (tester le comportement du proxy), il faut corriger la source.

---

## 🟠 Major Issues

### [TYPES] `src/auth.ts` — Usage de `as any` interdit

**Fichier :** `src/auth.ts`, lignes 28, 29, 35, 36
**Problem :** Les callbacks `jwt` et `session` utilisent `(user as any)` et `(session.user as any)` alors que les types augmentés sont déjà déclarés dans `src/types/next-auth.d.ts`. Le cast est inutile et viole `global-rules.md`.
**Fix :**
```typescript
// ✅ Les types JWT et Session sont augmentés dans next-auth.d.ts
async jwt({ token, user }) {
  if (user) {
    token.organizationId = user.organizationId  // typed via JWT augmentation
    token.role = user.role
  }
  return token
},
async session({ session, token }) {
  if (session.user) {
    session.user.organizationId = token.organizationId
    session.user.role = token.role
  }
  return session
},
```

---

### [DEAD CODE] `src/lib/nextAuthOptions.ts` — Fichier legacy avec `as any` massif

**Fichier :** `src/lib/nextAuthOptions.ts`, lignes 15, 75, 90
**Problem :** Ce fichier est la configuration de l'ancienne v4 de NextAuth. Il n'est plus utilisé par `src/auth.ts` mais reste dans le dépôt avec `adapter: PrismaAdapter(prisma) as any` et `} as any` à l'export. Il représente une dette technique et une source de confusion. Le `session: { strategy: 'jwt' }` ici n'est plus opérationnel.
**Fix :** Supprimer `src/lib/nextAuthOptions.ts`. Vérifier qu'aucun fichier ne l'importe encore (`grep -r "nextAuthOptions" src/`).

---

### [SPEC] `src/app/api/stats/route.ts` — Non-conforme à la spec `dashboard.md`

**Fichier :** `src/app/api/stats/route.ts`
**Problem (3 violations) :**
1. `findMany` + JS `reduce` pour calculer le CA : extrêmement inefficace sur des volumes importants (charge tous les enregistrements en mémoire). Doit utiliser l'agrégat Prisma `_sum`.
2. Aucun filtre `status: 'COMPLETED'` — la spec impose de ne compter que les RDV complétés.
3. Aucune validation Zod des query params `startDate`/`endDate` — la spec l'impose (`global-rules.md` + `dashboard.md`).
**Fix :**
```typescript
// ✅ Utiliser l'agrégat Prisma + filtre status
const result = await db.appointment.aggregate({
  where: { organizationId: orgId, status: 'COMPLETED' },
  _sum: { price: true }
})
const total = result._sum.price ?? 0
```

---

### [SPEC] `src/services/analytics.service.ts` — Couche service absente

**Problem :** La spec `specs/features/dashboard.md` exige la création de `src/services/analytics.service.ts` avec la méthode `getOrgStats(orgId, startDate, endDate)`. Cette couche est totalement absente. La logique métier est directement dans le handler API, violant l'architecture DRY imposée.
**Fix :** Créer `src/services/analytics.service.ts` et y déplacer toute la logique de calcul du CA, du comptage clients et du taux d'occupation. Le handler API ne doit faire que appeler ce service.

---

### [DRY] Double définition de `apiErrorResponse`

**Fichiers :** `src/lib/api.ts` ET `src/lib/utils.ts`
**Problem :** La fonction `apiErrorResponse` est définie deux fois avec des signatures légèrement différentes. `src/app/api/customers/route.ts` importe depuis `utils.ts`, les autres routes depuis `lib/api.ts`. Incohérence garantie.
**Fix :** Supprimer la version de `utils.ts`, conserver uniquement celle de `src/lib/api.ts`, et corriger l'import dans `customers/route.ts`.

---

## 🟡 Minor Issues

- **`src/app/api/packages/route.ts` (L25, L41) :** Utilise `console.error` directement au lieu du `logger` centralisé (`src/lib/logger.ts`). Violation de `global-rules.md` ("Pas de Logs de Debug").
- **`src/lib/api.ts` (L6) :** Idem, `console.error` au lieu du `logger`.
- **`src/app/actions/appointments.ts` (L75) :** `console.warn` résiduel.
- **`src/app/api/customers/route.ts` (L23, L36, L65, L116) :** Usage répété de `session.user?.organizationId as string`. Préférer une assertion propre après la vérification de nullité déjà présente en amont.

---

## 🧠 Global Recommendations

1. **Renommage critique immédiat :** Le seul renommage `proxy.ts → middleware.ts` suffit à rétablir la sécurité de base. C'est la priorité absolue.
2. **Supprimer le fichier `nextAuthOptions.ts`** : Il est source de confusion (double config auth), contient du `any` massif et n'est plus nécessaire.
3. **Implémenter la couche `services/`** : La logique d'agrégation des stats doit sortir des handlers API pour être testable unitairement (exigence spec + architecture).
4. **Type Augmentation Auth.js :** Les types `next-auth.d.ts` sont bien définis — exploiter ces types systématiquement au lieu de recourir à `as any`.
5. **Tests E2E manquants** : La spec `dashboard.md` exige un test Playwright comparant les chiffres entre deux organisations (isolation multi-tenant). Aucun test de ce type n'existe dans `test/`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Sécurité (CRITIQUE) :**
   - Renommer `src/proxy.ts` → `src/middleware.ts`
   - Corriger l'import `{ middleware }` dans `test/proxy.spec.ts` (ou exporter correctement depuis le middleware)
   - Corriger `actions/appointments.ts` L27 : `findUnique` → `findFirst` avec `organizationId`

2. **Priorité 2 — Types/Zod :**
   - Supprimer les 4 `as any` de `src/auth.ts` en utilisant les types augmentés
   - Supprimer `src/lib/nextAuthOptions.ts`
   - Unifier `apiErrorResponse` dans `src/lib/api.ts` uniquement

3. **Priorité 3 — Clean Code & Conformité Spec :**
   - Réécrire `src/app/api/stats/route.ts` avec Prisma `_sum` + filtre `COMPLETED`
   - Créer `src/services/analytics.service.ts` avec `getOrgStats`
   - Remplacer tous les `console.error` orphelins par `logger.error`

---

## 🧮 Final Decision

**❌ REJECTED**

Le projet est **non-déployable en l'état**. La faille critique (middleware non chargé par Next.js) rend l'ensemble des routes protégées accessibles sans authentification. L'AutoFixer doit corriger les 3 issues Critical avant tout autre travail.

