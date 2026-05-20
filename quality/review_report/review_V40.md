# 🧪 Next.js Code Review Report - V40

## 🧾 Summary
- **Score:** 52/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 0 | Major: 4 | Minor: 6
- **Branche :** `feature/reliable-appointment-notes`
- **Fichiers analysés :** `src/app/api/appointments/route.ts`, `src/components/calendar/AppointmentModal.tsx`, `src/hooks/useAppointmentForm.ts`, `test/e2e/notes.spec.ts`, `tests/notes.spec.ts`, `tests/e2e/notes.spec.ts`

---

## 🔴 Critical Issues (Blocking)
_Aucun._

---

## 🟠 Major Issues

### [TYPE-SAFETY] `let res` sans annotation de type → risque `any` implicite
**Problem :** Dans `route.ts` (PUT handler), `res` est déclaré avec `let res` sans type, puis casté via `(res as Prisma.BatchPayload)`. Cela crée un chemin de type `any` implicite contournant la type-safety. De plus, `updateMany` retourne déjà `Prisma.BatchPayload` — le cast est inutile et masque un bug potentiel.
**Fichier :** `src/app/api/appointments/route.ts`
**Fix :** Typer explicitement `let res: Prisma.BatchPayload` et supprimer le cast `as Prisma.BatchPayload` en bas.

---

### [TYPE-SAFETY] `as` cast sans commentaire `// RAISON:` (×2)
**Problem :** `err as Record<string, unknown>` est utilisé sans commentaire justificatif requis par `global-rules.md`. Règle : *"Le mot-clé `as` ne doit être utilisé qu'en dernier recours et doit être documenté par un commentaire `// RAISON: ...`"*.
**Fichier :** `src/app/api/appointments/route.ts` (dans le bloc `catch` du PUT)
**Fix :** Utiliser un type guard ou ajouter `// RAISON: narrowing nécessaire sur `unknown` après vérification typeof` sur chaque usage de `as`.

---

### [LOGIQUE MÉTIER] Fallback silencieux dangereux dans `handleSaveNote`
**Problem :** Dans `useAppointmentForm.ts`, si `initialData.start` est vide ET `date`/`startTime` sont aussi vides, le code utilise silencieusement `new Date().toISOString()` comme `startIso`. Cela enverrait un `PUT` qui **écrase l'heure de début du RDV avec l'heure courante**, corrompant les données en base sans aucune alerte.
**Fichier :** `src/hooks/useAppointmentForm.ts` — `handleSaveNote` bloc `fallback`
**Fix :** Remplacer le fallback par un `return false` avec log d'erreur explicite si `startIso` ne peut pas être déterminé. Ne jamais envoyer un `PUT` avec des données partiellement inventées.

---

### [TYPE-SAFETY] `catch (err)` sans annotation de type dans `handleSave`
**Problem :** Après le refactor, le `catch (err)` terminal de `handleSave` (non modifié dans le diff mais exposé à cause des modifications adjacentes) est sans type annotation. Par cohérence avec `global-rules.md`, les `catch` doivent déclarer `err: unknown`.
**Fichier :** `src/hooks/useAppointmentForm.ts`
**Fix :** Déclarer `catch (err: unknown)` et faire du narrowing ou passer à `apiErrorResponse`.

---

## 🟡 Minor Issues

- **`timer!` non-null assertion** dans `withTimeout` (`route.ts`) : utiliser `let timer: ReturnType<typeof setTimeout> | undefined` et `clearTimeout(timer)` sans `!`.
- **`setNoteWrapper` non mémoïsée** : fonction recréée à chaque render sans `useCallback`. Peut provoquer des re-renders inutiles si passée en prop.
- **Save indicator non-réactif** : `(Date.now() - form.noteSavedAt) < 5000` est évalué au render, non dans un `useEffect`/`setTimeout`. L'indicateur disparaîtra uniquement lors du prochain re-render, pas automatiquement après 5s.
- **`catch {}` silencieux** dans `handleSaveNote` : `try { const payload = await res.json(); ... } catch {}` — erreurs de parsing JSON avalées sans log.
- **Indentation incohérente** dans `AppointmentModal.tsx` : mélange d'espaces (2 et 4) dans le JSX du bloc note. Lancer `pnpm lint --fix`.
- **Tests E2E placeholder redondants** : deux fichiers `test/e2e/notes.spec.ts` et `tests/notes.spec.ts` contenant uniquement `test.skip(...)`. L'un d'eux est superflu. Le vrai test est dans `tests/e2e/notes.spec.ts`. Supprimer les placeholders ou les consolider.

---

## 🧠 Global Recommendations

1. **`withTimeout` pattern** : Ce helper est défini *à l'intérieur* du handler `PUT`, recréé à chaque requête. L'extraire dans `@/lib/withTimeout.ts` et l'exporter pour réutilisation (DRY).
2. **Tests E2E** : `tests/e2e/notes.spec.ts` est bien écrit mais utilise `data-testid="appointment-item-123"` hardcodé — fragile en CI. Ajouter un fixture de seed ou utiliser un `storageState` + un ID dynamique.
3. **Dette technique** : La logique `handleSaveNote` dans le hook est déjà la 3e variante de sauvegarde (après `handleSave` et `handleConfirmDelete`). Envisager un service `appointmentService.update()` unique dans `@/services` pour éviter 3 appels `fetch('/api/appointments', { method: 'PUT' })` éparpillés.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Types :**
   - `let res: Prisma.BatchPayload` + supprimer le cast superflu dans `route.ts`.
   - Ajouter `// RAISON:` sur les deux `as` restants ou remplacer par type guards.
   - `catch (err: unknown)` dans `handleSave`.

2. **Priorité 2 — Logique :**
   - `handleSaveNote` : remplacer le fallback `new Date()` par `return false` + `clientError(...)` si les dates sont indisponibles.

3. **Priorité 3 — Clean Code :**
   - Extraire `withTimeout` dans `@/lib/withTimeout.ts`.
   - `useCallback` sur `setNoteWrapper` et `handleSaveNote`.
   - Supprimer `timer!`, fix save indicator avec `useEffect`.
   - Nettoyer les fichiers placeholder redondants.

---

## 🧮 Final Decision

**❌ REJECTED** — 4 issues MAJOR à corriger avant merge. Aucune faille de sécurité critique (IDOR), mais le fallback silencieux dans `handleSaveNote` constitue un risque de corruption de données en production.

