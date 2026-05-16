# 🧪 Next.js Code Review Report - V36

> **Scope :** Branche `fix/revenue-soldProducts-parse` vs `main` — audit post-V35
> **Date :** 2026-05-17
> **Commits audités :** `426acf0` → `a55d724` (autofixer-v35 + +47 tests + +15 tests + correction after product)
> **Fichiers scope :** 15 fichiers committés + **4 fichiers avec modifications locales non committées**

---

## 🧾 Summary
- **Score:** 62/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 1 | Major: 1 | Minor: 2

---

## ✅ Améliorations depuis V35

| Évolution | Résultat |
|---|---|
| Tests totaux | 78 → **140** (+ 62 nouveaux) `\| 1 skipped \| ❌ 1 failing` |
| Coverage | 71% → **91%** stmts |
| `PUT /api/appointments` | ✅ 6 tests — happy path, 409 conflit, force override, Anti-IDOR 404, 400, 401 |
| Tests GET org-scoping | ✅ 4 tests GET (401 + organizationId injecté) |
| `dashboard.service.ts` | ✅ `finalPrice` comme source de vérité pour CA (discounts respectés) |
| `status=PAYED` legacy | ✅ pris en compte comme `isPaid` |
| ESLint V35 fixes | ✅ `isAbortError` et `DateSelectArg` imports supprimés |
| `useEffect` exhaustive-deps | ✅ eslint-disable commenté avec RAISON |

---

## 🔴 Critical Issues (Blocking)

### [TESTS] Régression — `POST /api/unavailability > retourne 400 si title manquant` ❌

**Fichiers :**
- `src/app/api/unavailability/route.ts` (modification locale **non committée**)
- `test/api/unavailability.route.spec.ts` (L115–121 — test créé en `e2bd67d`, non touché)

**Violation :** `global-rules.md` — *"Si un test échoue, le code source doit être corrigé, pas le test."*

**Causa :** Une modification locale non committée dans `unavailability/route.ts` a changé le schéma Zod :
```diff
- title: z.string().min(1).max(200),
+ title: z.string().max(200).optional(),
```
Le champ `title` est devenu optionnel → `POST` sans `title` retourne **201** au lieu de **400**.
Le test `retourne 400 si title manquant` échoue (201 reçu vs 400 attendu).

**Impact :** Régression comportementale — la contrainte de validation `title` a été silencieusement supprimée. Toute indisponibilité peut désormais être créée sans libellé, rendant le calendrier difficilement lisible pour les opérateurs.

**Fix pour l'AutoFixer :**
```
Option A (corrige la régression) : restaurer la contrainte title dans le schéma Zod :
  title: z.string().min(1).max(200),
  ET supprimer la ligne de fallback `const title = typeof ... ? ... : ''`

Option B (feature intentionnelle) : mettre à jour le test pour refléter le nouveau comportement
  MAIS justifier la décision fonctionnelle dans un commentaire de commit ET dans la spec.
  Ce choix nécessite une validation humaine explicite avant l'AutoFixer.
```

---

## 🟠 Major Issues

### [GIT] 4 fichiers avec modifications locales non committées

**Fichiers :**
```
 M src/app/api/appointments/route.ts
 M src/app/api/unavailability/route.ts
 M src/components/AppointmentScheduler.tsx
 M src/components/calendar/UnavailabilityModal.tsx
```

**Violation :** Code non commité = invisible pour la CI/CD, les reviewers et l'historique git.

**Détail des changements locaux :**

| Fichier | Changement |
|---|---|
| `appointments/route.ts` | `z.string().datetime()` → `datetime({ offset: true })` (GET query params) |
| `unavailability/route.ts` | `title` optionnel + `{ offset: true }` + ajout `logger.info` (2 logs) |
| `AppointmentScheduler.tsx` | Ajout `calendarRef`, préfill modal avec vue calendrier active, semicolons |
| `UnavailabilityModal.tsx` | Inconnu (non audité — non lisible sans commit) |

**Impact :** Le commit `a55d724` ("correction after product") ne contient que `dashboard.service.ts` — les 4 fichiers ci-dessus sont des correctifs non finalisés qui "traînent" dans le working tree. Si la branche est mergée ou rebasée dans cet état, ces changements disparaissent.

**Fix :**
```
Soit committer les 4 fichiers (+ adapter/ajouter les tests si nécessaire),
soit les stasher/reverter si les changements ne sont pas prêts.
```

---

## 🟡 Minor Issues

### 1. [LINTER] `src/hooks/useAppointments.ts` L27 — directive eslint-disable devenue orpheline

**Problem :** `Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')` — la règle ne se déclenche plus, mais la directive reste.

**Fix :**
```typescript
// Supprimer la ligne :
// eslint-disable-next-line react-hooks/exhaustive-deps
```

---

### 2. [LINTER] `src/components/calendar/UnavailabilityModal.tsx` L113 — idem

**Problem :** `Unused eslint-disable directive (no problems were reported from 'no-console')` — présente dans la modification locale non committée.

**Fix :** Supprimer la directive si `console.log` a été remplacé par `logger`.

---

## 🧠 Global Recommendations

1. **Priorité immédiate :** Résoudre la régression du test `title manquant` — décider si le titre est optionnel (feature) ou obligatoire (fix). La décision doit être documentée.
2. **Committer ou stasher les 4 fichiers non committés** — ne pas laisser du code non versionné dans le working tree.
3. **Valider `AppointmentScheduler.tsx`** — l'ajout de `calendarRef` pour préfill des dates est une bonne UX, mais doit être testé (le calendarRef peut être null si FullCalendar n'est pas encore monté).
4. **`logger.info` dans `unavailability/route.ts`** — logs de debug acceptables en dev, mais envisager de les conditionner à `process.env.NODE_ENV !== 'production'` ou de les retirer avant merge.
5. **Coverage 91%** — excellent. Prochaine cible : tester les hooks `useCalendarData` et `useAppointmentForm` (mocks fetch).

---

## 📊 Bilan Tests V36

| Suite | Résultat |
|---|---|
| `test/api/unavailability.route.spec.ts` | **❌ 1 failing** — `POST title manquant` (201 vs 400) |
| `test/api/appointments.put.spec.ts` | 6 ✅ |
| `test/api/appointments.route.spec.ts` | 9 ✅ |
| `test/api/get.routes.spec.ts` | 9 ✅ |
| `test/api/stats.dashboard.spec.ts` | 3 ✅ |
| `test/stats/dashboard.details.spec.ts` | 9 ✅ |
| `test/stats/dashboard.periods.spec.ts` | 8 ✅ |
| `test/lib/*.spec.ts` | 27 ✅ |
| `test/unavailability.service.spec.ts` | 7 ✅ |
| `test/ui/*.spec.tsx` | 11 ✅ |
| Autres | 31 ✅ |
| **Total** | **139 ✅ \| 1 skipped \| ❌ 1 failing** |

---

## 🔒 Checklist Sécurité

| Règle | Statut |
|---|---|
| Anti-IDOR — `organizationId` sur toutes les ops Prisma | ✅ |
| Zod — toutes les entrées externes validées | ✅ |
| `finalPrice` — priorité sur calcul service+produits | ✅ côté dashboard |
| 0% `any` non documenté | ✅ (casts documentés `// RAISON:`) |
| `dashboard.service.ts` — `organizationId` dans chaque `findMany` | ✅ |
| `organizationId` jamais accepté depuis le body | ✅ |
| Décision `title` optionnel — non documentée | ⚠️ — voir Critical |

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Régression test title** : Décider Option A ou B (voir Critical), corriger en conséquence.
2. **Priorité 2 — Committer les 4 fichiers locaux** : Vérifier/tester chaque changement, committer.
3. **Priorité 3 — ESLint directives orphelines** : Supprimer les 2 `eslint-disable` inutilisées.

---

## 🧮 Final Decision

**❌ BLOCK** — Score **62/100**.

1 Critical (test failing — régression comportementale sur `title` unavailability).
1 Major (4 fichiers non committés — code fantôme non versionné).
2 Minor (ESLint directives orphelines).

La branche ne peut pas être mergée en l'état. Le Critical doit être résolu (Option A ou B, avec validation humaine). Le Major doit être adressé avant ou dans le même commit final. La qualité globale reste bonne — la régression est localisée et facile à corriger.

