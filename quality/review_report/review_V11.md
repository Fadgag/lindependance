# 🧪 Next.js Code Review Report - V11

> Scope : Post-AutoFixer V10 — État du code au 16 avril 2026
> Fichiers audités :
> - `src/schemas/appointments.ts`
> - `src/app/api/appointments/[id]/checkout/route.ts`
> - `src/app/api/appointments/route.ts`
> - `src/app/api/customers/route.ts`
> - `src/lib/parseAppointmentJson.ts`
> - `src/components/dashboard/CheckoutModal.tsx`
> - `src/components/dashboard/ProductPicker.tsx`
> - `src/app/customers/[id]/page.tsx`

---

## 🧾 Summary
- **Score:** 91/100
- **Verdict:** ✅ APPROVED
- **Stats:** Critical: 0 | Major: 0 | Minor: 4

---

## 🔴 Critical Issues (Blocking)

Aucune.

---

## 🟠 Major Issues

Aucune.

---

## 🟡 Minor Issues

- **[LINT]** `src/schemas/appointments.ts` : 3 types exportés non consommés (`UpdatePaymentDetailsInput`, `CheckoutInput`, `UpdateAppointmentInput`). Warnings ESLint bénins — ces types seront utiles dès qu'un test ou un consommateur les importe. À conserver volontairement pour documentation de contrat API.

- **[A11Y]** `ProductPicker` : `aria-selected={false}` est codé en dur sur chaque `role="option"`. Il faudrait gérer un état de focus virtuel (highlighted index) et passer `aria-selected={true}` sur l'option active lors de la navigation clavier flèches. Actuellement Escape + clic fonctionnent, mais Up/Down n'est pas implémenté.

- **[TESTS]** Absence de test unitaire pour `parseJsonField` (cas null, string invalide, array direct, objet non-array). Utilitaire critique qui mérite une couverture Vitest dédiée.

- **[TESTS]** Absence de test E2E Playwright pour le flux complet : `ajouter produit → encaisser → vérifier historique client affiche soldProducts`. C'est le flux qui a été à l'origine du bug signalé — une régression future ne serait pas détectée.

---

## 🧠 Global Recommendations

1. **Tests `parseJsonField` :** Ajouter `test/lib/parseAppointmentJson.spec.ts` avec 5 cas : null, undefined, chaîne JSON valide (array), chaîne JSON objet (non-array), chaîne JSON invalide.
2. **Test E2E produit :** Créer `test/e2e/checkout-product.e2e.spec.ts` — seeder un produit, ouvrir le checkout, l'ajouter, confirmer, vérifier l'historique client.
3. **Navigation clavier `ProductPicker` :** Implémenter `highlightedIndex` + `ArrowUp`/`ArrowDown`/`Enter` + `aria-activedescendant` sur le conteneur `listbox`.
4. **`CheckoutModal` à 369 lignes :** Après l'extraction de `ProductPicker`, le modal reste au-dessus de 200 lignes. Une extraction future de `SoldProductList` (rendu des lignes produits + quantités) et `ExtrasList` réduirait encore la complexité.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer — si déclenché)

1. **Priorité 1 :** Créer `test/lib/parseAppointmentJson.spec.ts` (5 cas, ~30 lignes).
2. **Priorité 2 :** Ajouter navigation clavier dans `ProductPicker` (`highlightedIndex`, ArrowUp/Down/Enter, `aria-activedescendant`).
3. **Priorité 3 :** Créer test E2E `test/e2e/checkout-product.e2e.spec.ts`.

---

## 🧮 Final Decision

**APPROVED** — 0 Critical, 0 Major. Le code est sécurisé, typé et DRY. Les 4 mineurs sont documentés et non bloquants pour un merge. Recommandé : traiter les tests manquants en priorité avant la prochaine feature.

---

## 📊 Comparaison V10 → V11

| Indicateur | V10 | V11 | Delta |
|---|---|---|---|
| Score | 62/100 | 91/100 | **+29** |
| Critical | 1 | 0 | **-1** ✅ |
| Major | 4 | 0 | **-4** ✅ |
| Minor | 5 | 4 | -1 |
| Tests | 32/32 | 32/32 | = |
| Fichiers modifiés | — | 8 | — |
| Nouveaux fichiers | — | 3 | `parseAppointmentJson.ts`, `ProductPicker.tsx`, `review_V11.md` |

