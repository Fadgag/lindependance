# 🧪 Next.js Code Review Report - V6

**Date :** 2026-04-07
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Audit post-AutoFixer V5
**Baseline :** V5 → 14/100 ❌ BLOCK
**Tests :** 8/8 fichiers ✅ — 12/12 tests ✅

---

## 🧾 Summary

- **Score :** 69/100
- **Verdict :** ⚠️ CHANGES REQUIRED
- **Stats :** Critical: 0 | Major: 1 | Minor: 7

> **Contexte :** Progression majeure par rapport à V5 (+55 points). Le bug financier critique est résolu. Les types `any` des composants principaux (DashboardShell, CheckoutModal) sont éliminés. La validation Zod est en place sur PATCH settings. Le projet n'a plus de faille de sécurité IDOR détectée. Les problèmes restants sont limités à des casts non documentés dans `auth.ts` et des `any` dans des composants UI secondaires.

---

## ✅ Correctifs Confirmés (AutoFixer V5)

| Issue V5 | Statut |
|----------|--------|
| groupBy where clause ignorait le date range (🔴 Critical) | ✅ FIXED — `startDate: { gte: startStr, lte: endStr }` |
| `dashboard.service.ts` — 5 violations `any` (🟠 Major) | ✅ FIXED — `AppointmentGroupRow`, `Prisma.AppointmentGetPayload` |
| `analytics.service.ts` — `orderBy as any`, `startTime as any` (🟠 Major) | ✅ FIXED |
| `DashboardShell.tsx` — `initialData: any` (🟠 Major) | ✅ FIXED — `DashboardData` |
| `CheckoutModal.tsx` — 4 `any` props (🟠 Major) | ✅ FIXED — interfaces dédiées |
| `DashboardCharts.tsx` — typo + `formatter: any` (🟡 Minor) | ✅ FIXED |
| `appointments/route.ts` — `where: any`, `console.log`, décrement `as any` (🟡 Minor) | ✅ FIXED |
| `packages/route.ts` — `console.error` redondants (🟡 Minor) | ✅ FIXED |
| `settings/route.ts` PATCH — validation sans Zod (🟡 Minor) | ✅ FIXED — `PatchSettingsSchema` |
| `settings/layout.tsx` — `/settings/profile` → 404 (🟡 Minor) | ✅ FIXED — onglet désactivé |

---

## 🔴 Critical Issues

_Aucune issue critique détectée._ ✅

---

## 🟠 Major Issues

### [TYPES] `src/auth.ts` — Casts `as unknown as Record<string, unknown>` inutiles et non documentés

**Lignes :** 26, 34

```typescript
// Actuel (inutile depuis que next-auth.d.ts déclare les types)
const u = user as unknown as Record<string, unknown>      // L26
token.organizationId = (u['organizationId'] as string) ?? null

const t = token as unknown as Record<string, unknown>     // L34
session.user.organizationId = (t['organizationId'] as string) ?? null
```

**Violation :** `global-rules.md` — "Le mot-clé `as` ne doit être utilisé qu'en dernier recours et doit être documenté par un commentaire `// RAISON: ...`". En outre, depuis la création de `src/types/next-auth.d.ts`, ces casts sont **entièrement inutiles** : `User.organizationId`, `JWT.organizationId` et `Session.user.organizationId` sont tous déclarés.

**Fix :**
```typescript
// src/auth.ts — accès direct sans cast
async jwt({ token, user }) {
  if (user?.organizationId) token.organizationId = user.organizationId
  if (user?.role) token.role = user.role
  return token
},
async session({ session, token }) {
  if (session.user) {
    session.user.organizationId = token.organizationId ?? null
    session.user.role = token.role ?? 'USER'
  }
  return session
},
```

---

## 🟡 Minor Issues

1. **`src/services/analytics.service.ts` (L40–99)** — `getOrgDashboard` reste exportée malgré le commentaire `TODO: supprimer`. Bloquée par `test/analytics.service.spec.ts`. De plus, L18 (`getOrgStats`) et L65 (`getOrgDashboard`) utilisent `price as unknown as { toNumber?: () => number }` sans commentaire `// RAISON:`. Simplifier via `new Decimal(String(price ?? 0))` (pattern déjà utilisé dans `dashboard.service.ts`).

2. **`src/proxy.ts` (L3)** — `auth((req: any)` — le type `any` sur le paramètre de la fonction proxy. Auth.js v5 expose `auth()` avec un callback typé `(req: NextRequest) => Response | void`. Fix : remplacer `any` par `import type { NextRequest } from 'next/server'`.

3. **`src/hooks/useAppointments.ts` (L5, L16–17)** — `useState<any[]>([])` et `(apt: any)` ×2 dans filter/sort. Le hook manipule la shape des appointments retournés par `GET /api/appointments`. Une interface `AppointmentSummary` (sous-ensemble de `CheckoutAppointment`) suffit.

4. **`src/components/dashboard/AppointmentItem.tsx` (L3)** — `event: any, onCheckout: (apt: any) => void`. Ce composant est le point d'entrée vers `CheckoutModal` qui est maintenant typé avec `CheckoutAppointment`. Les deux devraient partager le même type.

5. **`src/app/page.tsx` (L20, L77)** — `useState<any>(null)` pour `selectedApt` et `(apt: any)` dans le `.map()`. Même type `CheckoutAppointment` que `CheckoutModal`.

6. **`src/app/customers/[id]/page.tsx` (L105)** — `client.appointments.map((apt: any) => ...)`. L'historique des appointments du client utilise `any` dans le map alors que la shape est connue (au moins `id`, `startTime`, `status`, `service.name`).

7. **`src/lib/api.ts` (L6)** — `console.error('API error:', err)` dans `apiErrorResponse`. C'est intentionnel (logging serveur) mais doit être migré vers le `logger` centralisé (`src/lib/logger.ts`) pour avoir un format uniforme en production.

---

## 🛡️ Bilan Sécurité (Anti-IDOR)

**Aucune faille IDOR détectée.** Vérifications :
- Toutes les routes API (`/api/appointments`, `/api/packages`, `/api/stats/**`, `/api/organization/settings`) vérifient `session.user.organizationId` avant tout accès Prisma. ✅
- Toutes les requêtes Prisma dans `dashboard.service.ts` et `analytics.service.ts` scopent par `organizationId`. ✅
- Le test E2E `stats.dashboard.e2e.spec.ts` vérifie l'isolation inter-organisations. ✅
- Le middleware injecte `x-org-id` de manière immuable. ✅

---

## 🧠 Global Recommendations

1. **`auth.ts`** : Le fix est trivial (2 lignes à supprimer) et élimine le seul Major restant. À traiter en priorité absolue.

2. **Interface `AppointmentSummary`** : Créer dans `@/types/models.ts` une interface partagée entre `useAppointments.ts`, `AppointmentItem.tsx`, `page.tsx` et `customers/[id]/page.tsx`. Shape minimale : `id`, `start`, `end`, `status`, `finalPrice`, `service`, `customer`, `extendedProps`. `CheckoutAppointment` (déjà créée) est une bonne base.

3. **`analytics.service.ts`** : La migration du test `analytics.service.spec.ts` vers `getDashboardForOrg` est la seule action restante pour supprimer le dead code. Prioriser lors du prochain sprint.

4. **`apiErrorResponse`** : Le `console.error` dans `lib/api.ts` est intentionnel mais devrait utiliser le `logger` pour un format structuré (JSON) en production. Faible priorité.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Typage strict (🟠 Major)
- `src/auth.ts` : Supprimer les 2 casts `as unknown as Record<string, unknown>`. Accès direct via les types `next-auth.d.ts`.

### Priorité 2 — Clean Code (🟡 Minor)
- `src/types/models.ts` : Ajouter `AppointmentSummary` (sous-ensemble de `CheckoutAppointment` pour les listes).
- `src/hooks/useAppointments.ts` : `useState<AppointmentSummary[]>([])`, supprimer les `(apt: any)`.
- `src/components/dashboard/AppointmentItem.tsx` : Typer props avec `CheckoutAppointment`.
- `src/app/page.tsx` : `useState<CheckoutAppointment | null>(null)`, supprimer `(apt: any)`.
- `src/app/customers/[id]/page.tsx` : Typer `apt` dans le map.
- `src/proxy.ts` : Remplacer `req: any` par `NextRequest`.

### Priorité 3 — Dead Code (🟡 Minor)
- Migrer `test/analytics.service.spec.ts` pour tester `getDashboardForOrg` au lieu de `getOrgDashboard`.
- Supprimer `getOrgDashboard` de `analytics.service.ts` (L45–99).
- Simplifier `getOrgStats` L18 : remplacer `price as unknown as ...` par `new Decimal(String(price ?? 0))`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED**

Score calculé : 100 − 1×10 − 7×3 = **69/100**

Le projet est dans un état fonctionnel et sécurisé. La Critical du bug financier (date range) est résolue. Les composants financiers critiques (DashboardShell, CheckoutModal, DashboardCharts) sont entièrement typés. L'AutoFixer peut atteindre 95+/100 en traitant les 3 priorités ci-dessus — aucune modification de schéma DB requise.

