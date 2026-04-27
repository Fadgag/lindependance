# 🧪 Next.js Code Review Report - V26

> **Scope :** `main` au 27 avril 2026 — suivi de V25 (branche `bug/date-in-rdv` mergée)
> **Fichiers audités :** `src/app/api/unavailability/route.ts`, `src/components/calendar/AppointmentModal.tsx`, `src/components/calendar/UnavailabilityModal.tsx`, `src/types/models.ts`

---

## 🧾 Summary
- **Score:** 51/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 4 | Minor: 3

---

## ✅ Corrections confirmées depuis V25
| Issue V25 | Statut |
|---|---|
| Filtre strict-containment GET → disparition événements | ✅ CORRIGÉ (overlap filter) |
| Récurrence DB orpheline (API + UI non câblés) | ✅ CORRIGÉ (CreateSchema + buildOccurrences + UI) |
| `UpdateSchema` mort | ✅ SUPPRIMÉ |

---

## 🟠 Major Issues

### [TYPE-SAFETY] `as any` persistant — `AppointmentModal.tsx:284`
**Problem :** `(selectedRange as any).start` et `new Date((selectedRange as any).start)` toujours présents. Violation directe de `global-rules.md`. Ce code est dead en pratique (le fallback `date` gère déjà le cas), mais il pollue et viole le standard zéro-`any`.
**Fichier :** `src/components/calendar/AppointmentModal.tsx:284`
**Fix :**
```ts
// Remplacer la ligne 284 :
else if (selectedRange && (selectedRange as any).start) baseDate = new Date((selectedRange as any).start)
// Par :
else if (selectedRange?.start) baseDate = new Date(selectedRange.start)
// selectedRange est déjà typé `Range | DateSelectArg` — start est de type Date, pas de cast needed
```

---

### [ARCHITECTURE] `type CustomerPackage` inline dans un composant UI — `AppointmentModal.tsx:81`
**Problem :** `type CustomerPackage = { id: string; sessionsRemaining: number; package?: ...; serviceId?: ... }` défini directement dans le composant UI. Viole la règle d'architecture (logique de type dans `@/types/models.ts`).
**Fichier :** `src/components/calendar/AppointmentModal.tsx:81`
**Fix :** Déplacer dans `src/types/models.ts` et importer :
```ts
// Dans @/types/models.ts :
export interface CustomerPackageSummary {
  id: string
  sessionsRemaining: number
  package?: { id?: string; name?: string }
  serviceId?: string | null
}
// Dans AppointmentModal.tsx :
import type { CustomerPackageSummary } from '@/types/models'
// Remplacer type CustomerPackage par CustomerPackageSummary
```

---

### [DRY] `Recurrence` type et constantes dupliqués entre `route.ts` et `UnavailabilityModal.tsx`
**Problem :** `type Recurrence = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'` et les labels associés sont définis séparément dans `route.ts` (lignes 7-8) et `UnavailabilityModal.tsx` (lignes 10-17). Toute future modification doit être faite en deux endroits.
**Fix :** Extraire dans `@/types/models.ts` :
```ts
// Dans @/types/models.ts :
export const RECURRENCE_OPTIONS = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const
export type Recurrence = typeof RECURRENCE_OPTIONS[number]
export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: 'Une seule fois',
  WEEKLY: 'Toutes les semaines',
  BIWEEKLY: 'Toutes les 2 semaines',
  MONTHLY: 'Tous les mois',
}
```
Puis importer dans `route.ts` et `UnavailabilityModal.tsx`.

---

### [ARCHITECTURE] `buildOccurrences` — logique métier dans le handler API
**Problem :** La fonction `buildOccurrences` (route.ts:19-35) génère les occurrences de récurrence directement dans le fichier de route. Selon `global-rules.md`, la logique métier doit être extraite dans `@/services`.
**Fix :** Créer `src/services/unavailability.service.ts` et y déplacer `buildOccurrences`. Le handler POST ne fait ensuite qu'appeler le service.

---

## 🟡 Minor Issues

- **`as string` casts `organizationId`** — `route.ts:42,99` : le guard garantit la non-nullité mais le cast `as string` n'est pas un narrowing TypeScript pur. Préférer `const organizationId = session.user.organizationId!` ou typer `Session.organizationId` comme `string` (non nullable) dans `@/types/models.ts`.
- **`catch { }` silencieux dans `AppointmentScheduler.tsx:105`** — `fetchUnavailabilities` avale les erreurs réseau sans log. Ajouter `catch (err) { import('../lib/clientLogger').then(({ clientError }) => clientError('fetchUnavailabilities error', err)) }`.
- **`(c as CustomerType)` redondant** — `AppointmentModal.tsx:103` : `customers` est déjà déclaré `CustomerType[]`, le cast est inutile. Supprimer le `as CustomerType`.

---

## 🧠 Global Recommendations

1. **Créer `src/services/unavailability.service.ts`** pour y loger `buildOccurrences` + la logique de vérification de conflit (actuellement inline dans `AppointmentScheduler`). Cela prépare un futur test unitaire de la logique de récurrence.
2. **`CustomerPackageSummary` dans `@/types/models.ts`** — plusieurs composants manipulent ce shape, autant le centraliser maintenant.
3. **`Recurrence` dans `@/types/models.ts`** — partageable entre API, UI et futurs tests sans créer de couplage circulaire.
4. **TODO.md** — les fallbacks `productsTotal` dans `dashboard.service.ts` sont désormais stabilisés en prod (colonnes présentes sur Neon). Envisager de nettoyer les ~80 lignes de fallback lors d'un prochain sprint.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Type Safety :** Supprimer `as any` dans `AppointmentModal.tsx:284`, supprimer cast redondant `:103`.
2. **Priorité 2 — Types centralisés :** Déplacer `CustomerPackage` → `CustomerPackageSummary` dans `@/types/models.ts` + `Recurrence` + `RECURRENCE_LABELS`.
3. **Priorité 3 — Architecture :** Extraire `buildOccurrences` dans `src/services/unavailability.service.ts`.
4. **Priorité 4 — Clean Code :** Ajouter log dans `catch` de `fetchUnavailabilities`, remplacer `as string` par `!`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score 51/100. Sécurité IDOR ✅ (organizationId appliqué partout). Les 4 majors sont de l'ordre de la dette technique / clean code, aucun bloquant fonctionnel. Les items 1 et 2 (suppression `as any` + type inline) sont les plus rapides à corriger. Lancer `/autofixer` pour atteindre ≥ 85/100.

