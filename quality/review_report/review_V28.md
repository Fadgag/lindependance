# 🧪 Next.js Code Review Report - V28

> **Scope :** Branche `fix/autofixer-v26` vs `main` — audit complet post-V27
> **Date :** 2026-04-27
> **Fichiers audités :** `src/app/api/appointments/route.ts`, `src/app/api/catalog/route.ts`, `src/app/api/unavailability/route.ts`, `src/components/AppointmentScheduler.tsx`, `src/components/calendar/AppointmentModal.tsx`, `src/components/calendar/UnavailabilityModal.tsx`, `src/hooks/useOrganizationSettings.ts`, `src/services/dashboard.service.ts`, `src/services/unavailability.service.ts`, `src/types/models.ts`, `test/unavailability.service.spec.ts`

---

## 🧾 Summary
- **Score:** 27/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 1 | Major: 3 | Minor: 6

---

## ✅ Corrections V27 confirmées

| Issue V27 | Statut |
|---|---|
| `as CustomerPackageSummary[]` sans Zod — `AppointmentModal.tsx` | ✅ CORRIGÉ — `CustomerPackageResponseSchema` Zod ajouté (L16-21) |
| `WhereClause` type inline dans `route.ts` | ✅ CORRIGÉ — `UnavailabilityWhereClause` exporté depuis `unavailability.service.ts` |
| Aucun test pour `buildOccurrences` | ✅ CORRIGÉ — `test/unavailability.service.spec.ts` créé avec 6 cas couvrants |

---

## 🔴 Critical Issues (Blocking)

### [SÉCURITÉ / IDOR] Delete unavailability non scopé par `organizationId`

**Fichier :** `src/app/api/unavailability/route.ts` — ligne 130

**Violation :** Global Rules §Sécurité & Data Isolation — *"Aucune donnée ne doit être lue ou écrite sans vérifier l'appartenance à `session.organizationId`."*

**Code fautif :**
```typescript
// ✅ findFirst vérifie l'appartenance
const existing = await prisma.unavailability.findFirst({ where: { id, organizationId }, ... })
if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

if (deleteAll && existing.recurrenceGroupId) {
  await prisma.unavailability.deleteMany({ where: { recurrenceGroupId: existing.recurrenceGroupId, organizationId } }) // ✅ scopé
} else {
  await prisma.unavailability.delete({ where: { id } }) // ❌ NO organizationId — IDOR potentiel
}
```

**Impact :** Si un attaquant (ou un bug de race condition) bypass le `findFirst` garde, le `delete({ where: { id } })` supprimera n'importe quelle unavailability de n'importe quelle organisation. La branche `deleteMany` est correctement scopée, mais la branche `delete` simple ne l'est pas. Inconsistance critique.

**Fix :**
```typescript
// Remplacer ligne 130 :
await prisma.unavailability.delete({ where: { id } })
// Par :
await prisma.unavailability.deleteMany({ where: { id, organizationId } })
```

---

## 🟠 Major Issues

### [DRY] `AppointmentScheduler.tsx` ignore le hook `useOrganizationSettings`

**Fichier :** `src/components/AppointmentScheduler.tsx` — lignes 54–71

**Problem :** Le hook `useOrganizationSettings` a été créé dans cette même branche (`src/hooks/useOrganizationSettings.ts`) précisément pour centraliser le fetch des settings d'organisation avec cache partagé. Pourtant `AppointmentScheduler` continue d'implémenter sa propre version inline avec `useState` + `useEffect` + `fetch('/api/organization/settings')` + listener `organization:settings-updated` — 18 lignes de code dupliqué.

**Conséquence :** Le cache du hook (`let cache`) n'est pas partagé avec cette implémentation locale. Si les settings changent, la sync est triplée (hook + Scheduler + Modal) et peut créer 3 requêtes simultanées au lieu de 1.

**Fix :**
```typescript
// Supprimer lignes 52-71 (openingTime/closingTime useState + useEffect)
// Remplacer par :
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings'
// ...
const { openingTime, closingTime } = useOrganizationSettings()
```

---

### [DRY] `AppointmentModal.tsx` ignore le hook `useOrganizationSettings`

**Fichier :** `src/components/calendar/AppointmentModal.tsx` — lignes 202–228

**Problem :** Même violation DRY. `AppointmentModal` définit `HORAIRE_OUVERTURE`/`HORAIRE_FERMETURE` avec son propre `useState` + `useEffect` + double fetch (au montage + sur événement). 26 lignes dupliquées identiques à la logique du hook.

**Fix :**
```typescript
// Supprimer lignes 202-228
// Remplacer par :
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings'
// ...
const { openingTime: HORAIRE_OUVERTURE, closingTime: HORAIRE_FERMETURE } = useOrganizationSettings()
```

---

### [ZOD] Absence de validation Zod sur les query params GET (appointments + unavailability)

**Fichiers :** `src/app/api/appointments/route.ts` (L18-19), `src/app/api/unavailability/route.ts` (L26-27)

**Problem :** Les paramètres URL `start` et `end` sont consommés directement via `new Date(param)` + check `isNaN`. Per Global Rules : *"Toute donnée provenant de l'extérieur (API Request, SearchParams) doit être validée par un schéma Zod avant traitement."*

L'absence de Zod laisse passer des strings malformées (ex : `start=constructor`, valeurs trop anciennes/futures) qui passent `isNaN` mais produisent des requêtes DB inattendues.

**Fix :**
```typescript
// Ajouter en haut des handlers GET :
const QuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
})
const query = QuerySchema.safeParse({ start: startParam, end: endParam })
if (!query.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
```

---

## 🟡 Minor Issues

1. **[SÉCURITÉ] DELETE `/api/appointments` — `id`, `from`, `confirm` lus depuis le body JSON sans validation Zod.** (L234-243) Corps parsé manuellement dans un try/catch avec cast implicite. Utiliser un schéma `z.object({ id: z.string().cuid(), from: z.string().optional(), confirm: z.boolean().optional() })`.

2. **[ARCHITECTURE] `AppointmentScheduler.tsx` — 485 lignes.** Dépasse la limite de 200 lignes fixée par les Global Rules. Extraction recommandée : `CalendarToolbar`, `CalendarEventContent`, `CalendarEventTooltip` en sous-composants.

3. **[ARCHITECTURE] `AppointmentModal.tsx` — 547 lignes.** Même violation. Sous-composants suggérés : `PackageSelector`, `TimeRangeSection`, `AppointmentFormActions`.

4. **[A11Y] `confirm()` natif dans `AppointmentModal.tsx` (L351) et `UnavailabilityModal.tsx` (L111).** Les boîtes de dialogue navigateur bloquent le thème, ne sont pas accessibles (WCAG 2.1), et ne fonctionnent pas dans certains contextes (iframes, SSR). Remplacer par une modale de confirmation dédiée ou `sonner` avec action callback.

5. **[TYPE-SAFETY] `as AppointmentRow` cast non documenté — `dashboard.service.ts` (L273).** Cast sans commentaire `// RAISON:` obligatoire selon Global Rules §Type Casting. La variable `soldProductsJson` est `unknown`, ce qui est correct, mais le cast direct sur `aRaw` doit être justifié inline.

6. **[TESTS] Cache module-level dans `useOrganizationSettings.ts` peut polluer les tests.** La variable `let cache: OrgSettings | null = null` et `let inflightPromise` sont globales au module. Sans reset entre les tests, un test qui modifie le cache affecte les suivants. Exporter une fonction `resetCache()` pour l'usage en tests, ou utiliser `vi.resetModules()`.

---

## 🧠 Global Recommendations

1. **Centralisation des settings** — Le hook `useOrganizationSettings` est excellent mais inutile s'il n'est pas utilisé. Appliquer dans tous les composants qui font ce fetch (scanner : `grep -r "api/organization/settings" src/`).

2. **Zod sur les SearchParams** — Pattern systématique à appliquer sur TOUS les handlers GET avec params. Créer un helper `parseSearchParams(url, schema)` dans `@/lib/api` pour éviter la répétition.

3. **Cleanup `deleteMany` = standard** — Pour toutes les opérations de suppression, utiliser `deleteMany` avec `organizationId` plutôt que `delete` + pré-vérification. Plus atomique, plus sûr.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — CRITIQUE :** Remplacer `prisma.unavailability.delete({ where: { id } })` par `deleteMany({ where: { id, organizationId } })` dans `api/unavailability/route.ts:130`.

2. **Priorité 2 — MAJOR DRY :** Refactoriser `AppointmentScheduler.tsx` (L52-71) et `AppointmentModal.tsx` (L202-228) pour utiliser `useOrganizationSettings()`.

3. **Priorité 3 — MAJOR ZOD :** Ajouter `QuerySchema.safeParse()` sur les params GET dans `appointments/route.ts` et `unavailability/route.ts`.

4. **Priorité 4 — MINOR :** Zod sur le body DELETE `appointments/route.ts`. Commentaire `// RAISON:` sur `as AppointmentRow` dans `dashboard.service.ts`.

---

## 🧮 Final Decision

**❌ BLOCK** — Score 27/100.

La branche n'est **pas mergeable** en l'état. Le IDOR potentiel sur la suppression des indisponibilités (`prisma.unavailability.delete` sans `organizationId`) est un bloquant critique. Les 3 issues Major dégradent significativement la maintenabilité et la conformité aux Global Rules V3.0.

**Fix minimal pour débloquer :** Corriger uniquement la ligne 130 de `api/unavailability/route.ts` + les 2 violations DRY (hook `useOrganizationSettings`). Les Zod sur GET params peuvent être traités en suivi immédiat.

