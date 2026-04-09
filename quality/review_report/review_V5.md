# 🧪 Next.js Code Review Report - V5

**Date :** 2026-04-07
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Audit post-V4 AutoFixer — état courant de la base de code
**Baseline :** V4 → 17/100 ❌ BLOCK
**Tests :** 8/8 fichiers ✅ — 12/12 tests ✅

---

## 🧾 Summary

- **Score :** 14/100
- **Verdict :** ❌ BLOCK
- **Stats :** Critical: 1 | Major: 4 | Minor: 7

> **Contexte :** Légère régression par rapport à V4. Les correctifs V4 ont résolu le bug de signature du service (✅), restauré les tests proxy (✅), corrigé `FinanceSettings.tsx` (✅), et eliminé les `any` directs dans `auth.ts` (✅). Cependant, l'implémentation du groupBy dans `dashboard.service.ts` introduit un **nouveau bug financier critique en production** (date range ignoré). La dette `any` a augmenté dans les composants UI, notamment `CheckoutModal.tsx` qui gère des données financières.

---

## ✅ Correctifs Confirmés (depuis V4)

| Issue V4 | Statut |
|----------|--------|
| Signature mismatch `getDashboardForOrg` (🔴 Critical) | ✅ FIXED — `PeriodParam = string \| { start?, end? }` |
| `proxy.spec.ts` orpheline (🟠 Major) | ✅ FIXED — `nextAuthAdapter.ts` créé, 3/3 tests verts |
| `FinanceSettings.tsx` — dailyTarget non chargé (🟠 Major) | ✅ FIXED — `useEffect` de chargement ajouté |
| `auth.ts` — 4 violations `any` (🟠 Major) | ✅ FIXED — `unknown` narrowing + `next-auth.d.ts` créé |
| `dashboard/page.tsx` — `redirect("/login")` (🟡 Minor) | ✅ FIXED — pointe vers `/auth/signin` |
| `dashboard.service.ts` — `startTime` dupliqué (🟡 Minor) | ✅ FIXED — clé morte supprimée |

---

## 🔴 Critical Issues (Blocking)

### [DATA] `dashboard.service.ts` — groupBy `where` clause ignore le date range → données toujours sur ALL TIME en production

**Fichier :** `src/services/dashboard.service.ts` L54–61

**Code problématique :**
```typescript
const grouped = await (prisma.appointment as any).groupBy({
  by: ['startDate'],
  where: {
    organizationId: orgId,
    startDate: { gte: undefined }, // ← no-op : undefined ignoré par Prisma
    /* placeholder for where */    // ← commentaire avouant le bug
  },
  _sum: { price: true },
  _count: { _all: true }
})
```

**Violation :** `global-rules.md` — "bug de paiement/compteur". En production, Prisma a `groupBy` disponible → la branche `if (hasGroupBy)` est toujours empruntée. Or, `startDate: { gte: undefined }` est un filtre no-op en Prisma (équivalent à pas de filtre). Résultat : **toutes les prises de rendez-vous depuis la création de l'organisation sont agrégées**, quelle que soit la période sélectionnée.

**Pourquoi les tests passent :** Les tests mockent `prisma.appointment.groupBy` et retournent des données fixes — le `where` n'est jamais vérifié (seul `test/api/stats.dashboard.spec.ts` contrôle `organizationId` mais pas les dates).

**Impact :** L'utilisateur pensant voir son CA du jour voit en réalité le CA cumulé de toute l'histoire de l'organisation. Faux pilotage financier.

**Fix :**
```typescript
// src/services/dashboard.service.ts — corriger le where dans groupBy
const grouped = await (prisma.appointment as any).groupBy({
  by: ['startDate'],
  where: {
    organizationId: orgId,
    startDate: { gte: start.toISOString().slice(0, 10), lte: end.toISOString().slice(0, 10) },
    status: { not: 'CANCELLED' },
  },
  _sum: { price: true },
  _count: { _all: true }
}).catch(() => null)
```
Et ajouter un test unitaire qui vérifie que `opts.where.startDate.gte` est bien défini (non-undefined) dans le mock.

---

## 🟠 Major Issues

### [TYPES] `src/services/dashboard.service.ts` — 5 violations `any` dans le service financier critique

**Lignes :** 52, 53, 56, 63, 168

```typescript
let appointments: any[] = []                                         // L52
const hasGroupBy = typeof (prisma.appointment as any).groupBy === 'function'  // L53
const grouped = await (prisma.appointment as any).groupBy({...})    // L56
appointments = grouped.map((g: any) => ({...}))                     // L63
appointmentCount = appointments.reduce((s: number, g: any) => ...)  // L168
```

**Violation :** `global-rules.md` — "Interdiction du `any`". Le service est le coeur du calcul financier.

**Fix :**
```typescript
// Créer une interface dans @/types/models.ts
interface AppointmentGrouped {
  startDate: string
  _sum: { price: string | number | null }
  _count: { _all: number } | number
}
interface AppointmentWithService {
  startTime: Date
  status: string
  finalPrice?: number | null
  service?: { price: number | null } | null
}
// Remplacer prisma.appointment as any par :
const prismaAppointment = prisma.appointment as unknown as {
  groupBy: (opts: unknown) => Promise<AppointmentGrouped[]>
}
```

---

### [TYPES] `src/services/analytics.service.ts` — dead code contradictoire + `as any` persistants

**Lignes :** 40, 44, 53, 59

**Problem :**
1. L40 : commentaire `// getOrgDashboard removed` — mais L44 : `export async function getOrgDashboard(...)` est toujours défini et exporté. Contradiction directe.
2. L53 : `orderBy: { startTime: 'asc' } as any` — `as any` sur un orderBy Prisma typé.
3. L59 : `const ad = new Date(a.startTime as any)` — `startTime` est un `Date` Prisma, le cast `as any` est inutile.

**Fix :** Supprimer `getOrgDashboard` (L44–98) entièrement. Corriger les 2 `as any` restants dans `getOrgStats` :
```typescript
// L53 : Prisma accepte nativement { startTime: 'asc' } sans cast
orderBy: { startTime: 'asc' }
// L59 : startTime est un Date Prisma, pas de cast nécessaire
const ad = new Date(a.startTime)
```
**Attention :** `test/analytics.service.spec.ts` importe `getOrgDashboard` — si la fonction est supprimée, le test doit être migré vers `getDashboardForOrg` du `dashboard.service.ts`.

---

### [TYPES] `src/components/dashboard/DashboardShell.tsx` — `initialData: any`

**Ligne :** 8

```typescript
interface DashboardShellProps {
    initialData: any;  // ← any sur un composant UI financier
    currentPeriod: string;
}
```

**Violation :** `global-rules.md` — "Interdiction du `any`". Le composant shell est le point d'entrée des données financières côté UI. Un type précis permet de détecter les breaking changes de l'API service.

**Fix :**
```typescript
// src/types/models.ts — ajouter
export interface DashboardTimeseries {
  date: string
  realized: number
  planned: number
  revenue: number
  count: number
  target: number
}
export interface DashboardSummary {
  totalRevenue: number
  realizedRevenue: number
  projectedRevenue: number
  appointmentCount: number
  newCustomerCount: number
  staffCount: number
}
export interface DashboardData {
  summary: DashboardSummary
  timeseries: DashboardTimeseries[]
}
// DashboardShell.tsx
interface DashboardShellProps {
    initialData: DashboardData;
    currentPeriod: string;
}
```

---

### [TYPES] `src/components/dashboard/CheckoutModal.tsx` — composant financier entièrement typé en `any`

**Lignes :** 11, 24, 54, 146

```typescript
const PaymentMethodBtn = ({ id, label, icon: Icon, active, disabled, onClick }: any) => (...)  // L11
const ExtraRow = ({ extra, index, isPaid, onUpdate, onRemove }: any) => (...)                    // L24
export default function CheckoutModal({ appointment, onClose, onRefresh }: any) {...}            // L54
onUpdate={(i: number, f: any, v: any) => {...}}                                                  // L146
```

**Violation :** `global-rules.md` — "Interdiction du `any`". Ce composant gère l'encaissement (paiement CB/espèces/virement, extras, finalPrice) — c'est le composant le plus critique du flux financier.

**Fix :** Créer les interfaces `Appointment`, `Extra` et les props de chaque sous-composant dans `@/types/models.ts` et les importer.

---

## 🟡 Minor Issues

1. **`src/components/dashboard/DashboardCharts.tsx` (L35)** — Faute typographique persistante depuis V4 : `"Chiffre d affaires"` → `"Chiffre d'affaires"`.

2. **`src/components/dashboard/DashboardCharts.tsx` (L83)** — `formatter={(value: any)` — le type `any` sur une fonction de formatage Recharts. Remplacer par `(value: number | string)`.

3. **`src/app/api/appointments/route.ts` (L16)** — `const where: any = { organizationId: ... }` — même pattern que V3 non corrigé.

4. **`src/app/api/appointments/route.ts` (L109)** — `data: { sessionsRemaining: { decrement: 1 } as any }` — Prisma supporte nativement `{ decrement: 1 }` sur les champs Int, le `as any` est inutile.

5. **`src/app/api/appointments/route.ts` (L78, L89, L114)** et **`src/app/api/packages/route.ts` (L25, L41)** — `console.log` / `console.error` directs. Non corrigé depuis V3. Utiliser `apiErrorResponse` déjà présent ou le logger.

6. **`src/app/(dashboard)/settings/layout.tsx` (L13)** — Onglet `"Mon Compte"` pointe vers `/settings/profile` — page inexistante → 404. Non corrigé depuis V4.

7. **`src/app/api/organization/settings/route.ts` (L27–29, PATCH)** — Validation sans Zod (`Number.isNaN`). Non corrigé depuis V4.

---

## 🧠 Global Recommendations

1. **Le pattern `hasGroupBy`** est fragile et masque le vrai problème : Prisma a toujours `groupBy` disponible en production. Supprimer ce runtime check et utiliser directement `findMany` avec `startTime` (champ existant dans le schéma) ou passer à `groupBy` **avec un where correct**. Ne pas maintenir deux branches différentes qui rendent les tests non-représentatifs du comportement en production.

2. **`analytics.service.ts`** : Si `getOrgDashboard` est utilisé par un test, la règle de non-régression s'applique — migrer le test vers `dashboard.service.ts` et supprimer la fonction morte. Un fichier de service avec un commentaire `// removed` suivi de la définition de la fonction est une dette technique claire.

3. **`CheckoutModal.tsx`** est le composant le plus important du produit (encaissement). Son typage doit être traité en priorité — une interface `CheckoutAppointment` dans `@/types/models.ts` servirait aussi à `AppointmentItem.tsx` (L3 `event: any`) et `useAppointments.ts` (L16-17 `apt: any`).

4. **Tests de non-régression sur le `where` de groupBy** : Ajouter un test qui vérifie que `opts.where.startDate.gte !== undefined` dans le mock. Les tests actuels ne détectent pas ce bug en production.

5. **`proxy.ts` vs `middleware.ts`** : Deux fichiers avec des logiques redondantes. `proxy.ts` (L3 `req: any`) et `middleware.ts` coexistent. Clarifier lequel est effectivement utilisé par Next.js et supprimer l'autre.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Corriger le bug financier (🔴 Critical)
- `src/services/dashboard.service.ts` L57–60 : corriger le `where` dans `groupBy` pour appliquer `startDate: { gte, lte }` à partir de `start` et `end` calculés.
- Ajouter assertion dans `test/api/stats.dashboard.spec.ts` : vérifier que `opts.where.startDate.gte` est non-undefined.

### Priorité 2 — Typage strict (🟠 Major)
- `src/types/models.ts` : ajouter `AppointmentGrouped`, `AppointmentWithService`, `DashboardData`, `DashboardSummary`, `DashboardTimeseries`, `CheckoutAppointment`.
- `src/services/dashboard.service.ts` : remplacer tous les `any` par les nouveaux types.
- `src/components/dashboard/DashboardShell.tsx` : remplacer `initialData: any` par `DashboardData`.
- `src/components/dashboard/CheckoutModal.tsx` : typer les props avec `CheckoutAppointment`.

### Priorité 3 — Supprimer le dead code (🟠 Major)
- `src/services/analytics.service.ts` : supprimer `getOrgDashboard` (L44–98).
- Migrer `test/analytics.service.spec.ts` → tester `getDashboardForOrg` depuis `dashboard.service.ts`.
- Corriger `as any` restants dans `getOrgStats` (L53 orderBy, L59 `new Date`).

### Priorité 4 — Clean Code (🟡 Minor)
- `DashboardCharts.tsx` L35 : corriger `"Chiffre d'affaires"`.
- `DashboardCharts.tsx` L83 : `(value: number | string)` à la place de `any`.
- `appointments/route.ts` L16 : typer `where` avec un objet structuré.
- `appointments/route.ts` L109 : retirer le `as any` sur `{ decrement: 1 }`.
- Routes : remplacer `console.log/error` par le helper `apiErrorResponse` ou `logger`.
- `settings/layout.tsx` : désactiver ou créer `/settings/profile`.
- `settings/route.ts` PATCH : ajouter schéma Zod.

---

## 🧮 Final Decision

**❌ BLOCK**

Score calculé : 100 − 1×25 − 4×10 − 7×3 = **14/100**

Le projet a progressé structurellement (tests 12/12 verts, FinanceSettings corrigé, nextAuthAdapter stable, signature service unifiée). Cependant un nouveau bug financier critique a été introduit lors de l'ajout du code `groupBy` (date range ignoré en production), et la dette `any` a augmenté dans les composants UI critiques (`CheckoutModal`, `DashboardShell`). L'AutoFixer doit traiter les 4 priorités dans l'ordre avant toute mise en production.

