# 🧪 Next.js Code Review Report - V31

> **Scope :** Branche `fix/autofixer-v26` vs `main` — audit post-AutoFixer V30
> **Date :** 2026-04-27
> **Fichiers audités :** `src/app/api/appointments/route.ts`, `src/app/api/catalog/route.ts`, `src/app/api/unavailability/route.ts`, `src/components/AppointmentScheduler.tsx`, `src/components/calendar/AppointmentModal.tsx`, `src/components/calendar/UnavailabilityModal.tsx`, `src/hooks/useOrganizationSettings.ts`, `src/services/dashboard.service.ts`, `src/services/unavailability.service.ts`, `src/types/models.ts`, `test/unavailability.service.spec.ts`

---

## 🧾 Summary
- **Score:** 91/100
- **Verdict:** ✅ APPROVED
- **Stats:** Critical: 0 | Major: 0 | Minor: 3

---

## ✅ Corrections V30 confirmées

| Issue V30 | Statut |
|---|---|
| `catalog/route.ts` — absence de try/catch | ✅ CORRIGÉ — `try { ... } catch (err) { return apiErrorResponse(err) }` |
| DELETE `appointments/route.ts` — `id` query param non validé | ✅ CORRIGÉ — `z.string().cuid().safeParse(id)` appliqué après merge query params + body |
| `AppointmentScheduler.tsx` — `FullCalendarComponent` inutilisée | ✅ CORRIGÉ — déclaration supprimée |
| `AppointmentScheduler.tsx` — `catch (e)` warning linter | ✅ CORRIGÉ — `catch` sans variable |

---

## 🔴 Critical Issues

_Aucune._

---

## 🟠 Major Issues

_Aucune._

---

## 🟡 Minor Issues

### 1. [TYPE-SAFETY] `catalog/route.ts` — Casts `as Service[]` et `as PProduct[]` redondants sans commentaire RAISON

**Fichier :** `src/app/api/catalog/route.ts` — L32 et L41

**Problem :** `prisma.service.findMany()` retourne déjà un `Service[]` fortement typé par Prisma. Le cast `(services as Service[]).map((s: Service) => ...)` est doublement redondant (cast sur le tableau ET annotation de type dans le `.map`). Per Global Rules §Type Casting : *"Le mot-clé `as` ne doit être utilisé qu'en dernier recours et doit être documenté par un commentaire `// RAISON: ...`"*. Ces casts sans commentaire constituent une violation formelle, même si non dangereux fonctionnellement.

**Fix :**
```typescript
// Option A — supprimer les casts (Prisma fournit le bon type) :
const mappedServices: CatalogItem[] = services.map((s) => ({ ... }))
const mappedProducts: CatalogItem[] = products.map((p) => ({ ... }))

// Option B — garder + documenter si un doute subsiste sur la version Prisma :
// RAISON: cast défensif en attente de migration schéma Prisma v6 — à supprimer post-migration
const mappedServices: CatalogItem[] = (services as Service[]).map(...)
```

---

### 2. [A11Y] `confirm()` natif — `AppointmentModal.tsx` + `UnavailabilityModal.tsx`

**Fichiers :** `src/components/calendar/AppointmentModal.tsx` (L351), `src/components/calendar/UnavailabilityModal.tsx` (L111)

**Problem :** `window.confirm()` — non thémé, non accessible (WCAG 2.1 AA), bloque le thread UI, ne fonctionne pas en iframe ni dans les tests Playwright. Tracé dans `TODO.md`.

**Fix (sprint dédié) :** Composant `<ConfirmDialog>` réutilisable basé sur `sonner` avec action callback.

---

### 3. [ARCHITECTURE] God Components — `AppointmentScheduler.tsx` (466 lignes) + `AppointmentModal.tsx` (~520 lignes)

**Problem :** Dépasse la limite de 200 lignes fixée par les Global Rules. Tracé dans `TODO.md`.

**Extraction suggérée :**
- `AppointmentScheduler` → `CalendarToolbar`, `CalendarEventContent`, `CalendarEventTooltip` + hook `useCalendarData`
- `AppointmentModal` → `PackageSelector`, `TimeRangeSection`, `AppointmentFormActions`

---

## 🧠 Global Recommendations

1. **Score plateau 91/100 :** Les 3 mineurs restants concernent tous des éléments déjà tracés en `TODO.md` (God Component, confirm()) ou un cast cosmétique non dangereux. La branche est saine.

2. **Couverture tests :** 49 ✅ | 1 skipped | 0 ❌. Bonne couverture des services métier. Prochaine cible recommandée : tests d'intégration sur `POST /api/appointments` (détection de collision) et `GET /api/catalog` (isolation organisation).

3. **Prochain sprint :** Implémenter `<ConfirmDialog>` (1 composant réutilisable pour les 2 modales) — effort estimé ~30 min, élimine le Minor A11Y définitivement.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — MINOR (quick win) :** Supprimer les casts redondants dans `catalog/route.ts` L32 et L41.
2. **Priorité 2 — MINOR (sprint dédié) :** Créer `<ConfirmDialog>` et remplacer les `confirm()` natifs.
3. **Priorité 3 — MINOR (sprint dédié) :** Découper les God Components.

---

## 🧮 Final Decision

**✅ APPROVED** — Score 91/100.

Zéro Critical, Zéro Major. Les 3 mineurs sont soit cosmétiques (casts redondants), soit des sprints dédiés déjà planifiés (confirm(), God Component). **La branche est mergeable.** Tapez `go push` pour pousser vers `fix/autofixer-v26`.

