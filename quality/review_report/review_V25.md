# 🧪 Next.js Code Review Report - V25

> **Scope :** Branche `bug/date-in-rdv` vs `main`
> **Fichiers audités :** `src/app/api/unavailability/route.ts`, `src/components/calendar/AppointmentModal.tsx`, `src/components/calendar/UnavailabilityModal.tsx`, `src/components/AppointmentScheduler.tsx`, `vitest.config.ts`, `prisma/schema.prisma`, `prisma/migrations/202604200*`

---

## 🧾 Summary
- **Score:** 48/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 4 | Minor: 4

---

## 🟠 Major Issues

### [TYPE-SAFETY] `as any` dans `AppointmentModal.tsx` ligne 284
**Problem :** `(selectedRange as any).start` et `new Date((selectedRange as any).start)` — usage explicite de `any`, violation directe de `global-rules.md`.
**Fichier :** `src/components/calendar/AppointmentModal.tsx:284`
**Fix :**
```ts
// Remplacer
else if (selectedRange && (selectedRange as any).start) baseDate = new Date((selectedRange as any).start)
// Par
else if (selectedRange?.start) baseDate = new Date(selectedRange.start)
// selectedRange est déjà typé DateSelectArg | Range (start: Date) — le cast any est inutile
```

---

### [QUERY] Filtre strict-containment dans `GET /api/unavailability` — cause les disparitions
**Problem :** Le filtre WHERE utilise `start: { gte: rangeStart }` ET `end: { lte: rangeEnd }` (strict containment). Un événement qui *commence avant* la plage affichée ou *se termine après* est exclu. C'est la vraie cause du bug "je perds l'affichage quand je change de semaine".
**Fichier :** `src/app/api/unavailability/route.ts:28-31`
**Fix :** Remplacer par un filtre de chevauchement (overlap) :
```ts
// Supprimer le type WhereClause + les conditions actuelles
// Remplacer par :
const where: Parameters<typeof prisma.unavailability.findMany>[0]['where'] = {
  organizationId,
  ...(startParam && endParam ? {
    start: { lt: new Date(endParam) },
    end:   { gt: new Date(startParam) },
  } : {}),
}
```

---

### [FEATURE-INCOMPLETE] Récurrence — colonnes DB orphelines (pas de support API/UI)
**Problem :** La migration `20260420100000_add_unavailability_recurrence` ajoute `recurrence` et `recurrenceGroupId` à la table `Unavailability`. Ni `CreateSchema` dans `route.ts`, ni `UnavailabilityModal.tsx` n'utilisent ces colonnes. La fonctionnalité de récurrence est déclarée dans le schéma mais non câblée — les données de récurrence ne sont jamais sauvegardées.
**Impact :** Dette technique critique — le code laisse croire que la récurrence fonctionne alors qu'elle est silencieusement ignorée.
**Fix :**
1. Ajouter `recurrence` et `recurrenceGroupId` dans `CreateSchema` :
```ts
const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  recurrence: z.enum(['NONE','WEEKLY','BIWEEKLY','MONTHLY']).optional().default('NONE'),
  recurrenceGroupId: z.string().uuid().optional().nullable(),
})
```
2. Câbler la génération des occurrences dans le `POST` et exposer l'UI dans `UnavailabilityModal`.

---

### [ARCHITECTURE] `type CustomerPackage` défini inline dans un composant UI
**Problem :** `type CustomerPackage = { id: string; sessionsRemaining: number; package?: ...; serviceId?: ... }` est défini directement dans `AppointmentModal.tsx` (ligne 81). La logique de type appartient à `@/types/models.ts`.
**Fichier :** `src/components/calendar/AppointmentModal.tsx:81`
**Fix :** Déplacer le type dans `src/types/models.ts` et l'importer.

---

## 🟡 Minor Issues

- **`UpdateSchema` mort** — `route.ts:14-16` : `UpdateSchema` est défini mais aucun handler `PUT` ne l'utilise. Supprimer ou implémenter le `PUT`.
- **`catch { /* ignore */ }`** — `AppointmentScheduler.tsx:105` : les erreurs réseau sur `fetchUnavailabilities` sont silencieusement avalées. Ajouter au minimum un `clientError` log.
- **`as string` casts sur `organizationId`** — `route.ts:22,63` : le guard `if (!session?.user?.organizationId)` garantit la non-nullité, mais le cast `as string` contourne TypeScript au lieu de faire un narrowing propre. Utiliser `const organizationId = session.user.organizationId!` ou typer `User` correctement.
- **`(c as CustomerType)` redondant** — `AppointmentModal.tsx:103` : `customers` est déjà `CustomerType[]`, le cast est inutile.

---

## 🧠 Global Recommendations

1. **Récurrence** : La feature est à ~30% d'implémentation. Il faut soit la compléter (API + UI), soit supprimer les colonnes de la migration pour ne pas laisser de dead-schema en production.
2. **Filtre overlap** : Corriger le filtre GET en priorité — c'est le bug le plus visible pour l'utilisateur.
3. **Types centralisés** : `CustomerPackage`, `CalEvent` (défini dans `AppointmentScheduler`) et les shapes d'API devraient tous être dans `@/types/models.ts`.
4. **`UpdateSchema` orphelin** : Soit implémenter `PUT /api/unavailability` (utile pour éditer le motif), soit nettoyer.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Bug visible** : Corriger le filtre GET overlap dans `route.ts`.
2. **Priorité 2 — Type Safety** : Supprimer `as any` dans `AppointmentModal.tsx:284`.
3. **Priorité 3 — Feature** : Câbler `recurrence` dans `CreateSchema` + POST (génération occurrences) + `UnavailabilityModal` UI.
4. **Priorité 4 — Clean Code** : Déplacer `type CustomerPackage`, supprimer `UpdateSchema` mort, ajouter log dans `catch`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Pas de faille de sécurité critique (organizationId toujours appliqué ✅), mais 4 majors bloquants dont un bug de régression visible (filtre overlap) et une feature à moitié implémentée (récurrence). Le score de 48/100 impose un passage par `/autofixer` avant merge en `main`.

