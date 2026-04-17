# 🧪 Next.js Code Review Report - V22

## 🧾 Summary
- **Score:** 78/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 4
- **Scope:** Branche `fix/details-filters-autofix-v1` — `git diff main...HEAD` (37 fichiers)

---

## 🔴 Critical Issues (Blocking)
_Aucun._

---

## 🟠 Major Issues

### [DRY] `computeRange` dupliqué dans `DashboardShell.tsx` et `DetailsFilterBar.tsx`

**Problem :**  
La fonction `computeRange` (calcul today/week/month/30days → `{ start, end }`) est copiée à l'identique dans `src/components/dashboard/DashboardShell.tsx` (lignes 18–50) et `src/components/dashboard/DetailsFilterBar.tsx` (lignes 36–66). Violation directe du principe **DRY** des global-rules.

**Fix :**  
Extraire dans `src/lib/computeDateRange.ts` :
```ts
export type RangeKey = 'today' | 'week' | 'month' | '30days'
export function computeDateRange(period: RangeKey | string): { start: string; end: string } { … }
```
Puis importer dans les deux composants. Aucun comportement à modifier — copier/coller la logique existante dans le helper.

---

## 🟡 Minor Issues

1. **`console.error` conditionnels non supprimés (dev)** — `src/services/dashboard.service.ts` (ligne 284) et `src/app/dashboard/details/page.tsx` (ligne 76) contiennent des `console.error` enveloppés dans `if (process.env.NODE_ENV !== 'production')`. Les global-rules exigent la suppression de tous les logs de debug avant finalisation. Ces blocs doivent être retirés ou remplacés par le logger interne (`src/lib/logger.ts`) qui gère déjà les niveaux par env.

2. **A11y — `aria-label` absents** sur les boutons `DetailsFilterBar.tsx` "Appliquer" (ligne 167) et "Réinitialiser" (ligne 180), et sur les `<input type="time">` de `ScheduleSettings.tsx` (lignes 74–96 : les `<label>` ne sont pas liés par `htmlFor`/`id`). Ajouter `aria-label="Appliquer la plage de dates"`, `aria-label="Réinitialiser les filtres"` et `id="opening-time"` + `htmlFor="opening-time"`.

3. **`as string` sans commentaire `// RAISON:`** — `src/app/api/dashboard/summary/route.ts` ligne 19 : `orgId = session.user.organizationId as string`. Le guard `!session?.user?.organizationId` à la ligne 18 couvre le cas, mais les global-rules imposent un commentaire `// RAISON:` pour tout usage de `as`. À ajouter.

4. **`tests/e2e/billing-accuracy.spec.ts` placeholder redondant** — Le fichier ne contient qu'un commentaire (9 lignes). Il coexiste avec `billing-accuracy.spec.js` qui est le test réel. Ce fantôme peut perturber les rapports de couverture et les runners TypeScript. Supprimer le fichier `.ts` ou le convertir en test TS complet.

---

## 🧠 Global Recommendations

1. **Extraire `computeDateRange`** dans `@/lib` (voir Major ci-dessus) — dette technique classique, risque de divergence entre `DashboardShell` et `DetailsFilterBar` si la logique évolue.
2. **Remplacer `console.error` par `logger.error`** pour homogénéiser la gestion des erreurs serveur et permettre un contrôle centralisé des niveaux de log par environnement.
3. **Ajouter `test/lib/parseSoldProducts.spec.ts`** (recommandation V21 non réalisée) — le helper `parseSoldProducts` est critique pour les calculs financiers; sans tests unitaires sur les edge-cases (null, `'[]'`, JSON invalide, `totalTTC` manquant), une régression peut passer inaperçue.
4. **TODO dans `create-billing-test-data/route.ts`** (ligne 44) : `prisma.$executeRawUnsafe` pour mettre à jour `productsTotal`. Maintenant que la migration est appliquée et le client regénéré (`npx prisma generate`), remplacer par `prisma.appointment.update({ data: { productsTotal: … } })` pour supprimer le SQL brut.
5. **`billing-accuracy.spec.ts` → convertir en `.ts`** : le test e2e de facturation est un test métier critique; garder une seule version bien typée (TS) est préférable pour la cohérence de la suite.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — MAJOR DRY :** Extraire `computeDateRange` dans `src/lib/computeDateRange.ts` et l'importer dans `DashboardShell.tsx` + `DetailsFilterBar.tsx`.
2. **Priorité 2 — Logs :** Supprimer/remplacer les `console.error` conditionnels par `logger.error` dans `dashboard.service.ts` et `details/page.tsx`.
3. **Priorité 3 — A11y :** Ajouter `aria-label` sur boutons `DetailsFilterBar` et corriger `htmlFor`/`id` dans `ScheduleSettings`.
4. **Priorité 4 — Types :** Ajouter `// RAISON:` sur le `as string` dans `summary/route.ts`.
5. **Priorité 5 — Cleanup :** Supprimer `billing-accuracy.spec.ts` placeholder. Remplacer `$executeRawUnsafe` par `prisma.appointment.update`.

---

## 🧮 Final Decision
**⚠️ CHANGES REQUIRED** — Zéro faille de sécurité. `organizationId` scopé systématiquement sur tous les endpoints. Zod présent sur toutes les entrées externes. Pas de `any`. Architecture globalement saine. 1 Major DRY bloquant l'approbation (risque de divergence métier entre composants), 4 Minors à corriger avant merge.

