# 🧪 Next.js Code Review Report - V30

> **Scope :** Branche `fix/autofixer-v26` vs `main` — audit post-AutoFixer V28
> **Date :** 2026-04-27
> **Fichiers audités :** `src/app/api/appointments/route.ts`, `src/app/api/catalog/route.ts`, `src/app/api/unavailability/route.ts`, `src/components/AppointmentScheduler.tsx`, `src/components/calendar/AppointmentModal.tsx`, `src/components/calendar/UnavailabilityModal.tsx`, `src/hooks/useOrganizationSettings.ts`, `src/services/dashboard.service.ts`, `src/services/unavailability.service.ts`, `src/types/models.ts`, `test/unavailability.service.spec.ts`

---

## 🧾 Summary
- **Score:** 88/100
- **Verdict:** ✅ APPROVED
- **Stats:** Critical: 0 | Major: 0 | Minor: 4

---

## ✅ Corrections V29 confirmées

| Issue V29 | Statut |
|---|---|
| IDOR `delete({ where: { id } })` sans `organizationId` | ✅ CORRIGÉ — `deleteMany({ where: { id, organizationId } })` |
| DRY inline fetch settings dans `AppointmentScheduler.tsx` (18 lignes) | ✅ CORRIGÉ — `useOrganizationSettings()` |
| DRY inline fetch settings dans `AppointmentModal.tsx` (26 lignes) | ✅ CORRIGÉ — `useOrganizationSettings()` |
| ZOD GET params dans `unavailability/route.ts` | ✅ CORRIGÉ — `QuerySchema.safeParse()` |
| ZOD GET params dans `appointments/route.ts` | ✅ CORRIGÉ — `GetQuerySchema.safeParse()` |
| ZOD body DELETE dans `appointments/route.ts` | ✅ CORRIGÉ — `DeleteBodySchema.safeParse()` |
| Cast `as AppointmentRow` sans commentaire | ✅ CORRIGÉ — `// RAISON:` ajouté |
| Cache module-level polluait les tests | ✅ CORRIGÉ — `resetOrganizationSettingsCache()` exportée |

---

## 🔴 Critical Issues

_Aucune._

---

## 🟠 Major Issues

_Aucune._

---

## 🟡 Minor Issues

### 1. [ERROR-HANDLING] `catalog/route.ts` — Absence de try/catch

**Fichier :** `src/app/api/catalog/route.ts` — GET handler entier

**Problem :** Toutes les autres routes du projet (`appointments`, `unavailability`, `dashboard`) encapsulent leur logique dans un `try/catch` avec `apiErrorResponse(err)`. `catalog/route.ts` n'a aucun try/catch. Une erreur Prisma (timeout DB, colonne manquante) propagera un stack trace non censuré dans la réponse HTTP 500.

**Fix :**
```typescript
export async function GET() {
  try {
    const session = await auth()
    // ... logique existante ...
    return NextResponse.json(catalog)
  } catch (err) {
    return apiErrorResponse(err)
  }
}
```
Ajouter `import apiErrorResponse from '@/lib/api'`.

---

### 2. [ZOD] DELETE `appointments/route.ts` — `id` en query param non validé par Zod

**Fichier :** `src/app/api/appointments/route.ts` — L243

**Problem :** `DeleteBodySchema` valide l'`id` comme `z.string().cuid()` quand il vient du body JSON. Mais quand le client envoie `?id=xxx` en query string (chemin le plus courant depuis le frontend), `id = url.searchParams.get('id')` est utilisé directement sans validation CUID. Un `id` malformé est rejeté par Prisma en pratique, mais la validation est incohérente selon le chemin emprunté.

**Fix :**
```typescript
// Après lecture des query params, valider l'id final :
const idValidation = z.string().cuid().safeParse(id)
if (!idValidation.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
id = idValidation.data
```

---

### 3. [LINTER] `AppointmentScheduler.tsx` L55 — `FullCalendarComponent` déclarée mais jamais utilisée

**Fichier :** `src/components/AppointmentScheduler.tsx` — L55

**Problem :** `const FullCalendarComponent = FullCalendar` — la variable `FullCalendarComponent` est déclarée mais le JSX utilise directement `<FullCalendar .../>` (non via cette variable). C'est un warning strict linter (`@typescript-eslint/no-unused-vars`) qui pollue la CI.

**Fix :** Supprimer L55 et utiliser directement `<FullCalendar ... />` dans le JSX (déjà le cas).

---

### 4. [A11Y] `confirm()` natif — `AppointmentModal.tsx` + `UnavailabilityModal.tsx`

**Fichiers :** `src/components/calendar/AppointmentModal.tsx` (L351), `src/components/calendar/UnavailabilityModal.tsx` (L111)

**Problem :** Boîtes de dialogue navigateur (`window.confirm()`) non thémées, non accessibles (WCAG 2.1 AA), ne fonctionnent pas dans certains contextes (iframes, tests Playwright). Déjà tracé dans `TODO.md`.

**Fix (sprint futur) :** Créer un composant `<ConfirmDialog>` avec `sonner` + callback.

---

## 🧠 Global Recommendations

1. **`catalog/route.ts` — Quick win immédiat :** Ajout du try/catch (5 lignes) — correction possible en 2 minutes avant le merge.

2. **Pattern DELETE id validation :** Envisager un helper `parseDeleteId(url)` dans `@/lib/api` qui lit `?id=xxx` ET le body et retourne un CUID validé — élimine la duplication dans les futures routes DELETE.

3. **`FullCalendarComponent` :** Pre-existing warning à nettoyer lors du prochain toucher à `AppointmentScheduler`.

4. **Tests :** 49 ✅ | 1 skipped | 0 ❌. Couverture services solide (`buildOccurrences`, `getDashboardForOrg`). Prochaine cible : tests route `POST /api/appointments` (collision detection).

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — MINOR (quick win 5min) :** Ajouter `try/catch + apiErrorResponse` dans `catalog/route.ts`.
2. **Priorité 2 — MINOR :** Valider le query param `id` via Zod CUID dans DELETE `appointments/route.ts`.
3. **Priorité 3 — MINOR :** Supprimer `const FullCalendarComponent = FullCalendar` dans `AppointmentScheduler.tsx`.
4. **Priorité 4 — MINOR (TODO) :** Remplacer `confirm()` par `<ConfirmDialog>` (sprint dédié).

---

## 🧮 Final Decision

**✅ APPROVED** — Score 88/100.

Zéro Critical, Zéro Major. Les 4 mineurs sont soit des quick wins isolés (try/catch catalog, suppression ligne inutilisée), soit déjà tracés dans `TODO.md` (confirm() a11y). La branche est **mergeable en l'état**. Les items 1–3 peuvent être appliqués par l'AutoFixer avant le merge sans risque.

