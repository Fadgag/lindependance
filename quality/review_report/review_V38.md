# 🧪 Next.js Code Review Report - V38

> **Scope :** Branche `feature/reliable-appointment-notes` vs `main` — audit post-V37
> **Date :** 2026-05-19
> **Fichiers scope (diff) :**
> - `src/app/api/appointments/route.ts`
> - `src/components/calendar/AppointmentModal.tsx`
> - `src/hooks/useAppointmentForm.ts`
> - `tests/notes.spec.ts`

---

## 🧾 Summary
- **Score:** 24/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 2 | Major: 2 | Minor: 3

---

## ✅ Améliorations depuis V37

| Évolution | Résultat |
|---|---|
| 2 fichiers non-committés (V37 Major) | ✅ **RÉSOLU** — `appointments/route.ts` + `AppointmentScheduler.tsx` committés |
| `datetime({ offset: true })` sur GET query params | ✅ Présent dans `appointments/route.ts` |
| Tests Vitest (hors nouveau fichier) | ✅ 140 ✅ \| 1 skipped — aucun test cassé côté Vitest natif |

---

## 🔴 Critical Issues (Blocking)

### [HOOKS] React.useState appelé après un `return` conditionnel dans AppointmentModal

**Violation :** Rules of Hooks React — un hook ne peut jamais être appelé après un `return` conditionnel (règle absolue React).

**Localisation :** `src/components/calendar/AppointmentModal.tsx`

```tsx
// L52
if (!isOpen) return null   // ← return conditionnel

// L54 — useState APRÈS le return = Rules of Hooks violation
const [unsavedNoteOpen, setUnsavedNoteOpen] = React.useState(false)
```

**Impact :** En production, React détecte un changement du nombre de hooks entre deux renders et lève une exception fatale :
> "Rendered more hooks than during the previous render."
> "React has detected a change in the order of Hooks."

Le composant crashe et l'agenda entier devient inaccessible dès que `isOpen` passe de `true` à `false` puis revient à `true`.

**Fix :**
```tsx
// Déplacer l'état AVANT le return conditionnel, en haut du composant
export default function AppointmentModal({ ... }) {
  const form = useAppointmentForm(...)
  const { ... } = form

  const [unsavedNoteOpen, setUnsavedNoteOpen] = React.useState(false)  // ← ICI

  const found = services.find(s => s.id === serviceId)
  const currentServiceColor = (found && found.color) ? found.color : "#CBD5E1"

  const attemptClose = async () => { ... }

  if (!isOpen) return null  // ← APRÈS tous les hooks
  // ...
}
```

---

### [BUG] `handleSaveNote` — body PUT incomplet → 400 systématique, feature complètement cassée

**Violation :** `UpdateAppointmentSchema` requiert `start`, `end`, `duration` (champs non-`.optional()`). `handleSaveNote` n'envoie que `{ id, note }`.

**Localisation :** `src/hooks/useAppointmentForm.ts` (L179-182) vs `src/schemas/appointments.ts` (L15-27)

```typescript
// useAppointmentForm.ts L179-182
body: JSON.stringify({ id: initialData.id, note })
// ↑ manque: start, end, duration — TOUS requis dans UpdateAppointmentSchema

// appointments.ts L17-19
start: z.string().refine(...),    // ← REQUIRED (pas .optional())
end:   z.string().refine(...),    // ← REQUIRED
duration: z.number().int().positive(),  // ← REQUIRED
```

**Impact :** Chaque appel à `handleSaveNote` (autosave onBlur + bouton "Enregistrer la note" + ConfirmDialog on close) reçoit une réponse HTTP 400. La note n'est **jamais** persistée. L'indicateur `✅ Enregistré` n'apparaît jamais. La feature principale de cette branche est entièrement non-fonctionnelle.

**Fix — Option A (recommandée) :** Créer une route dédiée `PATCH /api/appointments/note` ou adapter le schéma :
```typescript
// Option A1 : Rendre start/end/duration optionnels dans UpdateAppointmentSchema
// (si l'intent est de supporter les partial updates)
start: z.string().refine(...).optional(),
end:   z.string().refine(...).optional(),
duration: z.number().int().positive().optional(),

// Option A2 : Route PATCH dédiée (plus propre, séparation des responsabilités)
// PATCH /api/appointments/[id]/note  { note: string }
```
```typescript
// Option B : Enrichir handleSaveNote avec les champs requis depuis initialData
body: JSON.stringify({
  id: initialData.id,
  note,
  start: initialData.start ?? new Date().toISOString(),
  end: initialData.end ?? new Date().toISOString(),
  duration: initialData.duration ?? 30,
})
```

---

## 🟠 Major Issues

### [TESTS] `tests/notes.spec.ts` — fichier Playwright ramassé par Vitest → 1 test file FAILED

**Localisation :** `tests/notes.spec.ts`

**Problem :**
Le fichier est un test Playwright (`import { test, expect } from '@playwright/test'`) mais placé dans `tests/` — répertoire scanné par Vitest selon la config `vitest.config.ts`. Vitest tente d'exécuter ce fichier et échoue avec l'erreur :
```
Error: Playwright Test did not expect test.describe() to be called here.
 ❯ tests/notes.spec.ts:3:6
Test Files  1 failed | 22 passed
```

**Impact :** La CI/CD remonte 1 test file FAILED. La commande `pnpm vitest run` retourne un exit code non-zéro. Tout pipeline qui utilise ce résultat comme quality gate est bloqué.

**Fix :**
```bash
# Déplacer dans le répertoire E2E dédié (hors scope Vitest)
mv tests/notes.spec.ts test/e2e/notes.spec.ts
# Vérifier vitest.config.ts / playwright.config.js pour l'exclude des e2e
```

---

### [TYPES] 3 casts `any` non documentés dans `route.ts`

**Violation :** Global Rules — "Le mot-clé `as` ne doit être utilisé qu'en dernier recours et doit être documenté par un commentaire `// RAISON: ...`".

**Localisation :** `src/app/api/appointments/route.ts`

```typescript
// L238 — non documenté
const msg = ... ? String((err as any).message) : 'Unknown DB error'
// L239 — non documenté
if (msg === 'DB_TIMEOUT' || (err as any)?.code === 'P1001') {
// L244 — non documenté
if ((res as any).count === 0) return NextResponse.json(...)
```

**Fix :**
```typescript
// L238-239 : err est de type unknown (catch block) — narrow proprement
const msg = (err && typeof err === 'object' && 'message' in err)
  ? String((err as { message: unknown }).message) // RAISON: unknown catch — narrowing manuel avant typage Prisma PrismaClientKnownRequestError
  : 'Unknown DB error'
const code = (err && typeof err === 'object' && 'code' in err)
  ? (err as { code: unknown }).code  // RAISON: code Prisma non exposé dans le type d'erreur générique
  : undefined

// L244 : updateMany retourne Prisma.BatchPayload — typer correctement
import type { Prisma } from '@prisma/client'
const res: Prisma.BatchPayload = await withTimeout(prisma.appointment.updateMany(...))
if (res.count === 0) ...
```

---

## 🟡 Minor Issues

- **[TYPES] `(form as any).noteDirty` dans `AppointmentModal.tsx` L58 :** inutile — `noteDirty` est explicitement déclaré dans `UseAppointmentFormReturn` (L53). Remplacer par `form.noteDirty`.

- **[ARCH] `AppointmentModal.tsx` : 206 lignes** — dépasse le seuil de 200 lignes (Global Rules). La section note + ConfirmDialogs pourrait être extraite dans un sous-composant `<NoteField />`.

- **[E2E] `data-testid` absents sur les éléments clés ciblés par `tests/notes.spec.ts`** — les sélecteurs `[data-testid="appointment-note"]`, `[data-testid="save-indicator"]`, `[data-testid="appointment-modal"]`, `[data-testid="close-modal"]` sont référencés dans les tests E2E mais ne sont pas appliqués dans le composant. Les tests Playwright correspondants échoueront au runtime E2E.

---

## 🧠 Global Recommendations

1. **Correction hooks immédiate :** Le bug Rules of Hooks est une régression critique introduite sur cette branche. Il ne peut pas être mergé dans `main` — crashera en production.
2. **Choix d'architecture pour note-save :** La voie `PATCH` dédiée est plus robuste et respecte le principe de responsabilité unique. Évite de "polluer" le schéma `UpdateAppointmentSchema` avec des champs optionnels non nécessaires aux autres cas d'usage.
3. **Répertoire E2E cohérent :** Tous les tests Playwright doivent être dans `test/e2e/` (exclu du scope Vitest). Le répertoire `tests/` semble un nouveau répertoire qui n'est pas isolé.
4. **data-testid systématiques :** Lors de la création d'une feature interactive (note autosave), ajouter les `data-testid` en même temps que le code — ils font partie de la spec de la feature, pas d'une tâche séparée.

---

## 📊 Bilan Tests V38

| Suite | Résultat |
|---|---|
| Vitest — 22 fichiers natifs | **✅ 140 ✅ \| 1 skipped** |
| `tests/notes.spec.ts` (Playwright dans Vitest) | **❌ 1 file FAILED** (mauvais runner) |
| Tests Playwright E2E (`tests/notes.spec.ts`) | ⚠️ Non exécutables (data-testid manquants) |
| **Total Vitest** | **1 FAILED file \| 140 ✅ \| 1 skipped** |

---

## 🔒 Checklist Sécurité

| Règle | Statut |
|---|---|
| Anti-IDOR — `organizationId` sur toutes les ops Prisma | ✅ |
| Zod — toutes les entrées externes validées | ✅ (route.ts) |
| `finalPrice` — priorité sur calcul service+produits | ✅ |
| `organizationId` jamais accepté depuis le body | ✅ |
| `note` — longueur non bornée côté UpdateAppointmentSchema | ⚠️ Minor — `z.string().max(2000)` absent (CheckoutInputSchema a `max(2000)` mais `UpdateAppointmentSchema` n'a pas de `.max()`) |
| 0% `any` non documenté | ❌ 3 casts non documentés (route.ts L238, L239, L244) |

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Hook violation :** Déplacer `const [unsavedNoteOpen, setUnsavedNoteOpen] = React.useState(false)` avant le `if (!isOpen) return null` dans `AppointmentModal.tsx`.

2. **Priorité 2 — Note save broken :** Corriger le body du PUT dans `handleSaveNote` (options A1, A2, ou B décrites dans le Critical #2). Requiert validation humaine sur le choix d'architecture (PATCH dédié vs schéma partiel).

3. **Priorité 3 — Test file mal placé :** `mv tests/notes.spec.ts test/e2e/notes.spec.ts`.

4. **Priorité 4 — any casts :** Documenter ou typer correctement les 3 casts dans `route.ts`.

5. **Priorité 5 — data-testid :** Ajouter `data-testid="appointment-note"`, `data-testid="save-indicator"`, `data-testid="appointment-modal"`, `data-testid="close-modal"` dans `AppointmentModal.tsx`.

6. **Priorité 6 — (form as any).noteDirty → form.noteDirty :** Supprimer le cast inutile.

---

## 🧮 Final Decision

**❌ BLOCK** — Score **24/100**.

2 Critical. 2 Major. 3 Minor.

La branche introduit deux régressions bloquantes : un bug React (Rules of Hooks) qui crashe le composant en production, et un mismatch de schéma qui rend la feature note-save entièrement non-fonctionnelle. La suite Vitest remonte 1 test file FAILED. Ces trois points suffisent à bloquer le merge sur `main`.

