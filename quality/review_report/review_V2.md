# 🧪 Next.js Code Review Report - V2

> **Périmètre :** Feature `feature/new-rdv` — passe AutoFixer suite au rapport V1.
> **Date :** 2026-04-14
> **Suite de tests :** 24/24 ✅ (1 E2E skipped – requiert BDD réelle)
> **Delta V1 → V2 :** +9 tests (dateUtils × 9, modal validation × 1)

---

## 🧾 Summary

- **Score:** 92/100
- **Verdict:** ✅ APPROVED
- **Stats:** Critical: 0 | Major: 0 | Minor: 3

---

## 🔴 Critical Issues

_Aucune._

---

## 🟠 Major Issues

_Aucune. Les deux issues majeures du rapport V1 ont été résolues :_

- ✅ **DRY / Service Layer** — `src/services/appointmentService.ts` créé. `createAppointmentForOrg(payload, orgId)` est l'unique source de vérité. `quickAppointmentAction.ts` et `/api/appointments/quick/route.ts` délèguent à ce service.
- ✅ **Helpers date extraits** — `formatForDateTimeLocal` et `getDefaultStart` sont maintenant dans `src/lib/dateUtils.ts`, importées proprement, sans duplication. 9 tests unitaires couvrent tous les edge-cases (arrondi, clamp avant 08h, après 18h, passage minuit, créneau exact).

---

## 🟡 Minor Issues

1. **Import orphelin résiduel détecté et corrigé** — `QuickAppointmentModal.tsx` contenait un `import` à l'intérieur du corps de la fonction composant (ligne 52), causant une `SyntaxError` de transpileur. Corrigé : tous les imports sont maintenant au niveau du module.

2. **`data.errors` spread non typé (ligne 113)** — La réponse d'erreur serveur est spreadée via `{ ...prev, ...(data.errors || {}) }` sans que `data.errors` soit typé. L'objet `data` est inféré comme `any` depuis `res.json()`. À normaliser avec une interface ou un schéma Zod de réponse d'API.

3. **`vitest.config.ts` manque `fakeTimers` global** — Les tests `dateUtils.spec.ts` utilisent `vi.setSystemTime` (fakeTimers) sans que `fakeTimers` soit configuré globalement dans `vitest.config.ts`. Cela fonctionne mais nécessite que chaque test appelle `vi.useFakeTimers()` s'il veut isoler l'horloge. Ajouter `fakeTimers: { toFake: ['Date'] }` dans la config pour documenter l'intention.

---

## ✅ Corrections appliquées depuis V1

| Item V1 | Statut |
|---|---|
| 🟠 Logique création dupliquée | ✅ Extrait dans `appointmentService.ts` |
| 🟠 Helpers date dans composant | ✅ Déplacés dans `src/lib/dateUtils.ts` + 9 tests |
| 🟡 `useEffect` import inutilisé | ✅ Supprimé |
| 🟡 `'use server'` doublé | ✅ Supprimé |
| 🟡 Erreur texte absente champ service | ✅ `<p className="text-xs text-red-600">` ajouté |
| 🟡 `formRef.reset()` redondant | ✅ Supprimé, `formRef` retiré |
| 🟡 `CalEvent` interface dans composant | ✅ Déplacée au niveau module |
| 🟡 Cast `as string` non documenté | ✅ Remplacé par `!` avec commentaire `RAISON:` |
| 🟡 `any` dans mock de test | ✅ Typé avec `Customer` de `@/types/models` |
| 🟡 `load` non memoïsé | ✅ Wrappé dans `useCallback([], [])` |

---

## 🧠 Global Recommendations

- **`data.errors` typé** (minor restant) : créer une interface `ApiErrorResponse { error: string; errors?: Record<string, string> }` et l'utiliser pour typer `res.json()`.
- **Playwright E2E** : le test `e2e/stats.dashboard.e2e.spec.ts` reste skippé. Configurer un runner SQLite en CI permettrait de l'exécuter automatiquement et de capter des régressions cross-feature.
- **`src/lib/dateUtils.ts`** est maintenant un module pur testable — envisager de l'enrichir avec `roundToSlot(slotMinutes)` paramétrable si la granularité des créneaux devient configurable.

---

## 🧩 Refactoring Plan (Pour prochain cycle)

1. Typer la réponse d'API `res.json()` avec `ApiErrorResponse` dans `QuickAppointmentModal`.
2. Activer l'E2E en CI (SQLite ou Docker Postgres minimaliste).
3. Documenter la coexistence `tailwind.config.cjs` (v3 legacy) + `@theme` CSS v4 dans un README.

---

## 🧮 Final Decision

**✅ APPROVED — 92/100.**

Aucun bloquant. Les 2 majeurs sont résolus, la suite de tests passe à 24/24. Les 3 mineurs restants sont des améliorations de qualité non bloquantes.

