# 🧪 Next.js Code Review Report - V35

> **Scope :** Branche `fix/autofixer-v26` vs `main` — audit post-V34 sur ajout des 19 tests API
> **Date :** 2026-04-28
> **Commit audité :** `e2bd67d` — *test(sprint1): 19 nouveaux tests routes API*
> **Fichiers nouveaux :** `test/api/appointments.route.spec.ts`, `test/api/unavailability.route.spec.ts`, `test/unavailability.service.spec.ts` (modifié)

---

## 🧾 Summary
- **Score:** 81/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 3

---

## ✅ Améliorations depuis V34

| Évolution | Résultat |
|---|---|
| Tests totaux | 49 → **68** (+ 19 nouveaux) `\| 1 skipped \| 0 ❌` |
| `POST /api/appointments` | ✅ 4 tests — org scoping, Zod 400, 401 |
| `DELETE /api/appointments` | ✅ 5 tests — Anti-IDOR 404, PAID 403, CUID 400, 401 |
| `POST /api/unavailability` | ✅ 5 tests — NONE, WEEKLY ~26 occ., start≥end, title absent, 401 |
| `DELETE /api/unavailability` | ✅ 5 tests — occurrence seule, série complète, Anti-IDOR 404, id absent, 401 |

---

## 🔴 Critical Issues (Blocking)

_Aucune._

---

## 🟠 Major Issues

### [TESTS] `PUT /api/appointments` — 0% de couverture de tests

**Fichier :** `src/app/api/appointments/route.ts` (L172–229)

**Violation :** La section `2. 🔍 Checklist d'Examen` du reviewer skill exige la « Présence et pertinence des tests Vitest ». Le handler `PUT` est le plus complexe de la route (détection de conflit horaire, `force` flag, `updateMany` org-scoped) — et n'est couvert par aucun test.

**Impact métier :** La logique de conflit horaire (`findFirst` + check overlap) est la protection centrale contre les doubles réservations. Si elle est silencieusement cassée lors d'un refactor futur, aucun test ne le détectera.

**Scénarios non couverts :**
- `PUT` valide → retourne l'updated appointment
- `PUT` avec `force=false` → conflit horaire → 409
- `PUT` avec `force=true` → bypass du conflit
- Anti-IDOR : `PUT` d'un RDV appartenant à une autre org → 404
- `PUT` avec `id` manquant → 400

**Fix pour l'AutoFixer :**
```
Créer test/api/appointments.put.spec.ts (ou étendre appointments.route.spec.ts)
avec les 5 scénarios ci-dessus. Utiliser le même pattern de mock que POST/DELETE.
```

---

## 🟡 Minor Issues

### 1. [TESTS] `GET /api/appointments` & `GET /api/unavailability` — non testés

**Problem :** Les handlers `GET` (lecture + filtrage par date range + overlap query) ne sont pas couverts. Risque bas (lecture seule), mais le scoping `organizationId` en GET devrait être vérifié a minima.

**Fix :** Ajouter 1–2 tests par GET : session 401, et un test de happy path vérifiant que `where.organizationId` est bien injecté dans le `findMany`.

---

### 2. [LINTER] 3 warnings ESLint non résolus

**Fichiers :**
- `src/hooks/useAppointmentForm.ts` L5 — `isAbortError` importé mais non utilisé
- `src/hooks/useAppointmentForm.ts` L129 — `useEffect` avec deps manquantes (`setSelectedCustomerPackageId`, `setUsePackage`)
- `src/components/calendar/AppointmentModal.tsx` L13 — `DateSelectArg` importé mais non utilisé

**Fix :**
```typescript
// useAppointmentForm.ts L5 — supprimer l'import
- import { isAbortError } from '@/lib/utils'

// AppointmentModal.tsx L13 — supprimer l'import inutilisé
- import type { ..., DateSelectArg } from '@fullcalendar/core'

// useAppointmentForm.ts L129 — add exhaustive deps or eslint-disable avec commentaire RAISON
```

---

### 3. [ARCHITECTURE] `useAppointmentForm.ts` — 246 lignes (carried from V33)

Inchangé, accepté en l'état. Hook métier complexe, sections clairement commentées. Borne industrielle ~300 lignes.

---

## 🧪 Bilan Tests V35

| Suite | Résultat |
|---|---|
| `test/api/appointments.route.spec.ts` | 9 ✅ — POST (4) + DELETE (5) |
| `test/api/unavailability.route.spec.ts` | 10 ✅ — POST (5) + DELETE (5) |
| `test/unavailability.service.spec.ts` | 7 ✅ — buildOccurrences |
| `test/proxy.spec.ts` | 3 ✅ |
| `test/createAppointment.spec.ts` | 1 ✅ |
| `test/sessionsRemaining.spec.ts` | 1 ✅ |
| `test/analytics.service.spec.ts` | 1 ✅ |
| `test/stats/dashboard.service.spec.ts` | 2 ✅ |
| `test/api/stats.dashboard.spec.ts` | 2 ✅ |
| `test/api/dashboard.route.spec.ts` | 1 ✅ |
| `test/ui/*.spec.tsx` | 11 ✅ |
| `test/lib/*.spec.ts` | 20 ✅ |
| **Total** | **68 ✅ \| 1 skipped \| 0 ❌** |

### ✅ Qualité des nouveaux tests

| Critère | Résultat |
|---|---|
| Anti-IDOR testé (mock `findFirst → null`) | ✅ — `appointments` + `unavailability` |
| `organizationId` vérifié dans les appels Prisma | ✅ — `createCall.data.organizationId`, `deleteCall.where.organizationId` |
| Isolation des mocks (`vi.resetAllMocks()`) | ✅ |
| Validation Zod testée (400 sur champs invalides) | ✅ |
| Aucun test existant modifié (Anti-Régression) | ✅ |
| CUIDs valides dans les fixtures (pattern `/^c[^\s-]{8,}$/i`) | ✅ |

---

## 🔒 Checklist Sécurité

| Règle | Statut |
|---|---|
| Anti-IDOR — `organizationId` sur toutes les ops Prisma | ✅ |
| Zod — toutes les entrées externes validées | ✅ |
| `deleteMany` atomique (Anti-IDOR par construction) | ✅ |
| 0% `any` non documenté | ✅ (casts documentés `// RAISON:`) |
| Error handling — `try/catch + apiErrorResponse` | ✅ |
| `organizationId` jamais accepté depuis le body | ✅ — toujours extrait de la session |

---

## 🧠 Global Recommendations

1. **Priorité immédiate :** Tests `PUT /api/appointments` — 5 scénarios à implémenter pour atteindre 100% de couverture des routes modifiées.
2. **Quick wins :** Nettoyer les 3 warnings ESLint (`pnpm lint --fix` suffira pour les imports, useEffect deps à traiter manuellement).
3. **Moyen terme :** Tests unitaires `useCalendarData` et `useAppointmentForm` (hooks extractés, testables indépendamment via mocks `fetch`).
4. **Dette :** `soldProductsJson`/`productsTotal` — unifier les 2 chemins de parsing dans `dashboard.service.ts` (JSONB natif vs JSON string fallback).

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Tests `PUT /api/appointments`** : Créer `test/api/appointments.put.spec.ts` avec les 5 scénarios (happy path, conflit 409, force override, Anti-IDOR 404, validation 400).
2. **Priorité 2 — ESLint** : Supprimer `isAbortError` et `DateSelectArg` des imports; corriger ou documenter la dépendance manquante du `useEffect`.
3. **Priorité 3 — Tests GET** : 2 tests minimaux par GET (401 + org scoping).

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **81/100**.

Zéro Critical. 1 Major (PUT untested — logique de conflit horaire non couverte). 3 Minor (GET coverage gap, ESLint warnings, hook size carried).

La branche ne peut être mergée tant que le handler `PUT` n'a pas de tests. La qualité globale reste élevée — les 19 nouveaux tests sont exemplaires en termes de rigueur Anti-IDOR. L'AutoFixer peut résoudre tous les points en < 30 min.

