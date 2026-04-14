# 🧪 Next.js Code Review Report - V1

> **Périmètre :** Feature `feature/new-rdv` — Floating Action Button, QuickAppointmentModal, useAppointments hook, AppointmentScheduler, quickAppointmentAction, /api/appointments/quick.
> **Date :** 2026-04-14
> **Suite de tests :** 15/15 ✅ (1 E2E skipped – requiert BDD réelle)

---

## 🧾 Summary

- **Score:** 62/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 2 | Minor: 8

---

## 🔴 Critical Issues (Blocking)

_Aucune faille critique détectée._

- `organizationId` correctement scopé dans toutes les routes API et le Server Action.
- Zod validation présente côté serveur (schema `CreateAppointmentSchema`).
- Aucun IDOR identifié sur le flux de création rapide.

---

## 🟠 Major Issues

### [DRY] Logique de création dupliquée : Server Action + REST Route

**Problem :**
La logique de création de RDV est implémentée deux fois en parallèle :
- `src/app/actions/quickAppointmentAction.ts` (Server Action)
- `src/app/api/appointments/quick/route.ts` (REST API)

Les deux fichiers construisent la date `end`, valident via Zod et insèrent en base avec `prisma.appointment.create`. Toute correction (ex : gestion du conflit horaire, ajout de staffId) doit être répercutée dans les deux.

**Fix :** Extraire dans `src/services/appointmentService.ts` une fonction `createQuickAppointmentForOrg(payload, orgId)`. La Route API et le Server Action appellent uniquement cette fonction.

---

### [ARCHITECTURE] Fonctions utilitaires définies à l'intérieur du composant React

**Problem :**
`formatForDateTimeLocal` et `getDefaultStart` sont déclarées **à l'intérieur** de `QuickAppointmentModal` (lignes 22-54). Elles sont donc recréées à chaque render. Elles ne dépendent d'aucun état ou prop du composant.

**Fix :** Déplacer ces deux fonctions dans `src/lib/dateUtils.ts` et les importer. Ce module peut ensuite être testé unitairement de façon isolée (edge cases : minuit, passage 23h30 → lendemain 08h00, etc.).

---

## 🟡 Minor Issues

1. **Import inutilisé** — `useEffect` importé ligne 3 de `QuickAppointmentModal.tsx` mais jamais appelé dans le composant. Déclenche un warning ESLint `no-unused-vars`. Supprimer.

2. **Directive `'use server'` doublée** — `quickAppointmentAction.ts` déclare `"use server"` en ligne 1 ET ligne 10 (à l'intérieur de la fonction). Le second est redondant avec le premier au niveau du module. Supprimer la ligne 10.

3. **Message d'erreur absent pour le champ `service`** — La validation affiche `aria-invalid="true"` sur le `<select>` prestation mais aucun `<p className="text-xs text-red-600">` n'est rendu en dessous (contrairement aux champs `customer`, `start`, `duration`). Incohérence UX : l'utilisateur voit le fond rouge mais pas le texte explicatif.

4. **`formRef.current?.reset()` redondant** — Depuis que le `<textarea name="note">` est contrôlé (state `note`), tous les champs du formulaire sont contrôlés. `formRef.current?.reset()` dans `resetForm()` n'a plus d'effet réel. Supprimer l'appel (et potentiellement le `formRef` lui-même).

5. **Interface `CalEvent` déclarée à l'intérieur de la fonction composant** — Ligne 21 de `AppointmentScheduler.tsx`. Une interface TypeScript déclarée dans un corps de fonction est réanalysée à chaque render par le compilateur (overhead). La déplacer au niveau du module ou dans `@/types/models.ts`.

6. **`as string` cast non documenté sur `organizationId`** — `quickAppointmentAction.ts` ligne 54 : `organizationId: session.user.organizationId as string`. Le guard ligne 42 garantit que la valeur n'est pas nulle, mais TypeScript ne le propage pas. Remplacer par `session.user.organizationId!` avec un commentaire `// RAISON: guard ligne 42`, ou affiner le type dans `next-auth.d.ts`.

7. **`any` dans les mocks de test** — `test/ui/quickAppointmentModal.spec.tsx` ligne 29 : `({ customers, selectedId, onSelect }: any)`. Typer explicitement avec les types du projet (`Customer[]`, `string`, `(id: string) => void`).

8. **`load` non memoïsé dans `useAppointments`** — `load` est recréée à chaque render mais le `useEffect` (deps: `[]`) et l'event listener `onUpdated` capturent la référence initiale. Fonctionnel aujourd'hui car `load` ne dépend pas de props/state, mais fragile si le hook évolue. Wrapper dans `useCallback([])` pour signaler explicitement l'intention et éviter les warnings React Compiler.

---

## 🧠 Global Recommendations

- **Service Layer :** Le pattern "Server Action + Route API qui font la même chose" va continuer à proliférer si aucun service n'est introduit. Priorité : créer `src/services/appointmentService.ts` comme single source of truth pour la logique de création/modification de RDV.
- **`dateUtils.ts` :** Les fonctions de manipulation de dates (arrondi créneau, clamp horaires) sont du domaine métier. Les centraliser permet de les tester unitairement avec des mocks de `Date.now()`.
- **Playwright E2E :** Le test `e2e/stats.dashboard.e2e.spec.ts` est skippé (requiert BDD réelle). Envisager un setup de BDD de test SQLite en CI pour qu'il s'exécute automatiquement.
- **Tailwind v4 + legacy config :** Le `tailwind.config.cjs` (format v3) coexiste avec le `@theme` CSS v4. La source de vérité des couleurs est maintenant `globals.css`. Le fichier `tailwind.config.cjs` peut induire en erreur les développeurs. Documenter dans un `README` ou migrer entièrement.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 – DRY / Service Layer :**
   - Créer `src/services/appointmentService.ts` → fonction `createQuickAppointmentForOrg`.
   - Faire appeler cette fonction par `quickAppointmentAction.ts` ET `api/appointments/quick/route.ts`.

2. **Priorité 2 – Extraction utilitaires :**
   - Déplacer `formatForDateTimeLocal` + `getDefaultStart` vers `src/lib/dateUtils.ts`.
   - Ajouter tests unitaires dans `test/lib/dateUtils.spec.ts` (cas : avant 08h, après 18h, minuit, 17h45, etc.).

3. **Priorité 3 – Clean Code :**
   - Supprimer `useEffect` import inutilisé dans `QuickAppointmentModal.tsx`.
   - Supprimer directive `'use server'` doublée.
   - Ajouter message d'erreur texte sous le champ `serviceId`.
   - Supprimer `formRef` + `formRef.current?.reset()` (redondant).
   - Déplacer `CalEvent` interface hors du composant.
   - Corriger le cast `as string` sur `organizationId`.
   - Typer les mocks de tests (supprimer `any`).
   - Wrapper `load` dans `useCallback`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — 62/100.

Aucun bloquant sécurité. Les deux issues majeures (DRY service layer + helpers dans composant) doivent être corrigées avant merge. Les 8 points mineurs peuvent être traités en une passe AutoFixer.

