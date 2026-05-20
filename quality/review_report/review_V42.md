# 🧪 Next.js Code Review Report - V42

## 🧾 Summary
- **Score:** 56/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 1 | Major: 1 | Minor: 3
- **Branche :** `feature/reliable-appointment-notes`
- **Fichiers analysés (diff `main...HEAD`) :**
  `src/app/api/appointments/route.ts`, `src/components/calendar/AppointmentModal.tsx`,
  `src/lib/withTimeout.ts`, `tests/e2e/notes.spec.ts`, `test/e2e/notes.spec.ts`, `tests/notes.spec.ts`
  _(+ tous les fichiers de la branche, aucune nouvelle issue détectée sur les autres composants)_

---

## ✅ Résolution des issues V41

- ✅ Double `as any` dans le catch du PUT (`route.ts`) — corrigé : `errObj?.['message']` / `errObj?.['code']`.
- ✅ `withTimeout` extrait dans `src/lib/withTimeout.ts` — importé et utilisé dans `route.ts`.
- ✅ Save indicator — `useEffect` ajouté dans `AppointmentModal.tsx`.
- ✅ Indentation `AppointmentModal.tsx` — cohérente à 2 espaces dans le bloc note.
- ✅ Commentaires placeholders `test/e2e/notes.spec.ts` et `tests/notes.spec.ts` — clarifiés, pointent tous les deux vers `tests/e2e/notes.spec.ts`.

---

## 🔴 Critical Issues (Blocking)

### [REACT] `useEffect` appelé après le `return null` conditionnel — violation des Rules of Hooks
**Violation :** React Rules of Hooks — *"Don't call Hooks inside conditions"*. Le lint `react-hooks/rules-of-hooks` bloque ce pattern en production.
**Fichier :** `src/components/calendar/AppointmentModal.tsx` — lignes 55 et 67.
**Code incriminé :**
```tsx
// ligne 52-53 : useState OK (avant le return)
const [unsavedNoteOpen, setUnsavedNoteOpen] = React.useState(false)
const [showSavedIndicator, setShowSavedIndicator] = React.useState(false)

if (!isOpen) return null  // ← ligne 55 : early return

// ...

React.useEffect(() => {  // ← ligne 67 : HOOK APRÈS EARLY RETURN ❌
  if (!form.noteSavedAt) { setShowSavedIndicator(false); return }
  setShowSavedIndicator(true)
  const t = setTimeout(() => setShowSavedIndicator(false), 5000)
  return () => clearTimeout(t)
}, [form.noteSavedAt])
```
**Impact :** En production, React lèvera `"Rendered more hooks than during the previous render"` lorsque `isOpen` passe de `false` à `true` (ou inversement). Comportement imprévisible / crash de la modale.
**Fix :** Déplacer `React.useEffect` **avant** le `if (!isOpen) return null`. Les deux `useState` sont déjà correctement placés.
```tsx
const [unsavedNoteOpen, setUnsavedNoteOpen] = React.useState(false)
const [showSavedIndicator, setShowSavedIndicator] = React.useState(false)

// ✅ useEffect AVANT l'early return
React.useEffect(() => {
  if (!form.noteSavedAt) { setShowSavedIndicator(false); return }
  setShowSavedIndicator(true)
  const t = setTimeout(() => setShowSavedIndicator(false), 5000)
  return () => clearTimeout(t)
}, [form.noteSavedAt])

if (!isOpen) return null  // ← early return en dernier
```

---

## 🟠 Major Issues

### [NULL-SAFETY] `findFirst` non null-checké avant `NextResponse.json`
**Violation :** `global-rules.md` — Atomicité et robustesse ; un `null` non vérifié retourné au client est un bug silencieux.
**Fichier :** `src/app/api/appointments/route.ts` — ligne 241-242.
**Code incriminé :**
```typescript
const updated = await withTimeout(prisma.appointment.findFirst({ ... }))
return NextResponse.json(updated)  // ← `updated` peut être null
```
`findFirst` retourne `T | null`. Si une race condition se produit entre `updateMany` et `findFirst` (ex: suppression concurrente), `updated` est `null` et le client reçoit `null` en JSON plutôt qu'une erreur structurée.
**Fix :**
```typescript
const updated = await withTimeout(prisma.appointment.findFirst({ ... }))
if (!updated) return NextResponse.json({ error: 'Not found after update' }, { status: 404 })
return NextResponse.json(updated)
```

---

## 🟡 Minor Issues

- **[TYPE-SAFETY] `as T` sans `// RAISON:` dans `withTimeout.ts`** (ligne 8) : `Promise.race([p, timeout])` retourne `Promise<T | never>` = `Promise<T>` en TypeScript — le cast est redondant mais doit quand même être documenté (`// RAISON: T | never simplifie en T, cast explicite pour clarté`).

- **[TESTS] Deux fichiers placeholder redondants** : `test/e2e/notes.spec.ts` (runner Vitest/test/) ET `tests/notes.spec.ts` (runner Vitest/tests/) pointent tous les deux vers `tests/e2e/notes.spec.ts`. Ces deux placeholders sont inutiles simultanément. Supprimer celui de `tests/notes.spec.ts` (duplication à la racine) ou les consolider en un seul.

- **[TESTS E2E] `data-testid="appointment-item-123"` hardcodé** (`tests/e2e/notes.spec.ts`) : fragile en CI sans seed. Utiliser `process.env.E2E_APPOINTMENT_ID` ou un fixture Playwright pour garantir l'existence du RDV.

---

## 🧠 Global Recommendations

1. **Rules of Hooks** : En dehors de ce composant, vérifier que aucun autre composant ne place un hook après un `return null` conditionnel (linter `react-hooks/rules-of-hooks` devrait les attraper en CI).
2. **`withTimeout` robustesse** : Considérer d'ajouter un test unitaire Vitest sur `src/lib/withTimeout.ts` (timeout effectif, cas nominal, cas `null` retourné).
3. **`findFirst` pattern** : Dans tout handler PUT/POST qui fait `updateMany` puis `findFirst`, s'assurer systématiquement que le null est vérifié.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Critical (Rules of Hooks) :**
   - `AppointmentModal.tsx` : déplacer `React.useEffect` avant le `if (!isOpen) return null`.

2. **Priorité 2 — Major (Null Safety) :**
   - `src/app/api/appointments/route.ts` : ajouter `if (!updated) return NextResponse.json(...)` après le `findFirst`.

3. **Priorité 3 — Minor :**
   - `src/lib/withTimeout.ts` : ajouter `// RAISON:` sur le `as T`.
   - Supprimer `tests/notes.spec.ts` ou le consolider.

---

## 🧮 Final Decision

**❌ REJECTED** — 1 Critical bloquant (crash React en production par violation des Rules of Hooks), 1 Major (null non vérifié). Les corrections sont rapides (2 lignes à déplacer + 2 lignes à ajouter).

