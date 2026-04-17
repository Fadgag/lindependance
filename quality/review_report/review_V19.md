# 🧪 Next.js Code Review Report - V19

## 🧾 Summary
- **Score:** 62/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 4 | Minor: 3
- **Scope:** Fichiers modifiés localement (git status) : `src/services/dashboard.service.ts`, `src/app/dashboard/details/page.tsx`, `src/components/dashboard/DashboardShell.tsx`, `src/components/dashboard/DetailsFilterBar.tsx`

---

## 🔴 Critical Issues (Blocking)
_Aucun._

---

## 🟠 Major Issues

### [TYPE] `Array<any>` dans `getDashboardDetails`
**Problem :** `let rows: Array<any> = []` — violation directe de la règle `global-rules.md` : interdiction de `any`. Le type exact est connu grâce à Prisma mais le try/catch dual-path force un typage dynamique.
**Fix :** Extraire un type explicite `AppointmentSelectResult` correspondant au shape exact du `select` (id, startTime, status, finalPrice, price, soldProducts, customer, service). Le déclarer dans `@/types/models.ts` ou en inline. Remplacer `Array<any>` par ce type.

```ts
// @/types/models.ts — à ajouter
export type AppointmentDetailRow = {
  id: string
  startTime: Date
  status: string
  finalPrice: number | null
  price: Prisma.Decimal
  soldProducts: unknown
  customer: { firstName: string; lastName: string } | null
  service: { name: string; price: Prisma.Decimal } | null
}
```

---

### [TYPE] `catch (e: any)` dans le fallback productsTotal
**Problem :** `catch (e: any)` — interdit par `global-rules.md`. Le `any` doit être remplacé par `unknown` avec narrowing.
**Fix :**
```ts
} catch (e: unknown) {
  const msg = String((e as Error)?.message ?? '').toLowerCase()
  // ...
}
```

---

### [ARCHITECTURE] Logique de filtre DB dupliquée (DRY violation)
**Problem :** Le filtre WHERE pour `services` et `products` est défini deux fois (`whereWithProductsTotal` et `whereWithoutProductsTotal`) avec une duplication quasi-totale, sans extraction de fonction. Violation DRY.
**Fix :** Extraire une fonction `buildFilterWhere(filter, includeProductsTotal: boolean): Prisma.AppointmentWhereInput` dans le service, appelée avec les deux flags. Réduire le code de ~40 à ~10 lignes.

---

### [ARCHITECTURE] Totaux calculés en JS sur les items de la page (biais de pagination)
**Problem :** `totalAmount`, `totalServicesSum`, `totalProductsSum` sont calculés en accumulant sur `rows` — qui correspond à la **page courante** (max 50 lignes, `skip`, `take`). Si `total > pageSize`, les récapitulatifs n'affichent que la somme partielle de la première page, pas le total réel des filtres.
**Fix :** Utiliser `prisma.appointment.aggregate` (ou `groupBy`) pour calculer les totaux sur le WHERE complet (sans skip/take). Ex :
```ts
const aggResult = await prisma.appointment.aggregate({
  where: effectiveWhere,
  _sum: { finalPrice: true },
  _count: { id: true }
})
```
Pour `productsTotal`, si la colonne n'existe pas, fallback en récupérant tous les ids + finalPrice et sommer (sans les select coûteux).

---

## 🟡 Minor Issues
- **`w-[200px]`** dans `DetailsFilterBar.tsx` : peut s'écrire `w-50` (avertissement Tailwind déjà signalé).
- **`useEffect` de synchronisation** dans `DetailsFilterBar` : la dépendance `computeRange` n'est pas dans le tableau de dépendances (`eslint-plugin-react-hooks` remonterait un warning). Mémoriser la fonction avec `useCallback` ou inclure `computeRange` dans les deps.
- **Page `details` : `searchParams` typé avec `any` implicite** via `(rawParams as any).start` — peut être typé proprement avec une interface `RawSearchParams`.

---

## 🧠 Global Recommendations

1. **Pagination + agrégats** : la page Details doit passer à une architecture paginée complète (le `total` DB existe déjà) avec des agrégats calculés côté DB, pas côté JS.
2. **Migration `productsTotal`** : la double-requête try/catch est un workaround de migration non appliquée. Appliquer `prisma migrate deploy` pour aligner le schéma, puis supprimer le fallback. Simplification significative du code.
3. **Type centralisé** : créer `@/types/dashboard.ts` avec `AppointmentDetailRow`, `DashboardDetailItem`, `DashboardTotals` — actuellement éparpillés entre le service et la page.
4. **Zod sur les SearchParams** : déjà présent ✅ — conserver le schéma strict, ne pas le relâcher.
5. **organizationId systématiquement scopé** dans toutes les requêtes ✅ — bon.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Types :** Remplacer `Array<any>` par un type explicite + `catch (e: unknown)` avec narrowing.
2. **Priorité 2 — Architecture :** Extraire `buildFilterWhere(filter, withProductsTotal)` pour supprimer la duplication.
3. **Priorité 3 — Correctness :** Déplacer le calcul des totaux côté DB (`prisma.aggregate`) pour corriger le biais de pagination.
4. **Priorité 4 — Minor :** Corriger les classes Tailwind et l'oubli de dépendance `useEffect`.

---

## 🧮 Final Decision
**⚠️ CHANGES REQUIRED** — Pas de faille de sécurité (IDOR absent, organizationId systématique ✅, Zod présent ✅). Deux violations de typage (`any`) et un bug de précision des totaux (biais pagination) bloquent le APPROVED.

