# 🧪 Next.js Code Review Report - V20

## 🧾 Summary
- **Score:** 80/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 2 | Minor: 2
- **Scope:** Branche `fix/details-filters-autofix-v1` — diff HEAD~1

---

## 🔴 Critical Issues (Blocking)
_Aucun._

---

## 🟠 Major Issues

### [TYPE] `(rawParams as any).start` dans `details/page.tsx`
**Problem :** Lignes 26–29 de `page.tsx` utilisent `(rawParams as any).start`, `(rawParams as any).from`, etc. Cela viole la règle `global-rules.md` (interdiction de `any`). Le type `searchParams` déclaré dans la signature est `{ from?: string; to?: string; filter?: string; status?: string }` mais les clés `start`/`end` ne sont pas dans ce type.
**Fix :** Élargir le type de la prop `searchParams` pour inclure toutes les clés attendues, puis accéder directement sans cast :
```ts
export default async function DetailsPage({ searchParams }: {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
    start?: string | string[];
    end?: string | string[];
    filter?: string | string[];
    status?: string | string[];
  }>
})
```
Puis accéder via `rawParams.start ?? rawParams.from` sans `as any`.

---

### [TYPE] `selectForTotals: any` + `allForTotals as any[]` dans `dashboard.service.ts`
**Problem :** Lignes 355–362 introduisent deux nouvelles violations `any` pour contourner le typage dynamique du `select` conditionnel.
**Fix :** Extraire le select dans deux constantes typées statiquement (une avec `productsTotal`, une sans), et assigner le résultat au type union :
```ts
type TotalsRowBase = { finalPrice: number | null; service: { price: Prisma.Decimal } | null; soldProducts: unknown }
type TotalsRowWithProducts = TotalsRowBase & { productsTotal: number | null }
```
Utiliser deux appels `findMany` conditionnels typés, ou utiliser un type assertion documenté avec `// RAISON: champ conditionnel selon présence colonne DB`.

---

## 🟡 Minor Issues

- **Double loop produits** dans `getDashboardDetails` : la logique de parsing de `soldProducts` est répétée deux fois (dans la boucle `items` et dans la boucle `allForTotals`). Extraire un helper `parseSoldProducts(raw: unknown): number` pour supprimer la duplication.
- **Totaux items (page) vs totaux complets** : les variables `totalAmount / totalServicesSum / totalProductsSum` de la boucle `items` (lignes 309–345) sont calculées mais jamais utilisées dans le return (on retourne `computedTotals` à la place). Ces variables sont du code mort — les supprimer.

---

## 🧠 Global Recommendations

1. **Supprimer le code mort** : les trois accumulateurs `totalAmount`, `totalServicesSum`, `totalProductsSum` de la boucle `items` (calculés mais non renvoyés) introduisent de la confusion. Retirer ces 3 lignes + leurs déclarations.
2. **Extraire `parseSoldProducts`** : helper pur à placer dans `@/lib/` ou `@/services/`. Testable unitairement.
3. **Planifier la migration** : le try/catch `productsTotal` est temporaire. Dès que la migration est appliquée, supprimer la branche fallback entière pour simplifier le service.
4. **OrganizationId toujours scopé** ✅ — bon.
5. **Zod sur les SearchParams** toujours présent ✅ — bon.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Types :** Typer correctement le `searchParams` dans `page.tsx` → supprimer les `as any`.
2. **Priorité 2 — Types :** Typer `selectForTotals` + `allForTotals` sans `any` dans le service.
3. **Priorité 3 — DRY :** Extraire `parseSoldProducts(raw: unknown): number` pour éviter la double boucle.
4. **Priorité 4 — Code mort :** Supprimer les accumulateurs inutilisés (`totalAmount/totalServicesSum/totalProductsSum` de la boucle `items`).

---

## 🧮 Final Decision
**⚠️ CHANGES REQUIRED** — Amélioration significative par rapport à V19 (+18 pts). Plus de faille de sécurité. Les deux remaining `any` sont les derniers obstacles au ✅ APPROVED. La logique est correcte et robuste.

