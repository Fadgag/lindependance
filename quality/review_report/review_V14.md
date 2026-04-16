# Review Report V14 — 2026-04-16

## Score global : 86/100 ↑ (+12 vs V13)

---

## ✅ Améliorations confirmées depuis V13

| ID V13 | Statut | Correction effectuée |
|--------|--------|----------------------|
| SEC-01 | ✅ Résolu | Tippy.js : DOM nodes, `allowHTML: false` — plus de XSS |
| SEC-02 | ✅ Résolu | PUT atomique via `updateMany({ where: { id, organizationId } })` |
| SEC-03 | ✅ Résolu | `service.findFirst` filtre désormais par `organizationId` |
| SEC-04 | ✅ Résolu | `soldProducts` typé `Prisma.JsonValue`, 0% `any` |
| PERF-01 | ✅ Résolu | Import statique `UpdateAppointmentSchema` |
| PERF-02 | ✅ Résolu | `AbortController` sur `datesSet` + `lastRangeRef` guard |
| BUG-02 | ✅ Résolu | Clé React stable `key={p.productId}` |
| DRY-02 | ✅ Résolu | Import `Product` fusionné |
| CLEAN-02 | ✅ Résolu | `pad` extraite au niveau module |

---

## 🟠 Majeur (bugs restants)

### [BUG-01] PUT client ne met à jour que `Note` — `customers/route.ts` + `schemas/customers.ts`
`CustomerUpdateSchema` ne contient que `id` et `notes`. Les champs `firstName`, `lastName`, `phone` sont absents. Il est impossible de modifier les données principales d'un client via l'API PUT.
**Correction :** Étendre `CustomerUpdateSchema` et propager les champs dans `prisma.customer.updateMany`.

### [BUG-03] DELETE appointment ne scope pas le `delete` — `appointments/route.ts` l. 233
```ts
await prisma.appointment.delete({ where: { id } })
```
La suppression finale utilise `{ where: { id } }` sans `organizationId`. Bien qu'une vérification `findFirst` soit faite en amont (l. 210), les deux opérations ne sont pas atomiques. Un gap de race condition entre le findFirst et le delete permettrait théoriquement de supprimer un RDV d'une autre organisation.
**Correction :** Utiliser `deleteMany({ where: { id, organizationId: session.user.organizationId } })`.

### [BUG-04] Bloc `if` vide dans DELETE (ex-CLEAN-01) — `appointments/route.ts` l. 226–230
Le bloc `if (finalPrice > 0 || isPaidStatus) { /* ... */ }` ne fait toujours rien. Génère une confusion sur l'intention et signale une logique de protection manquante.
**Correction :** Soit bloquer la suppression d'un RDV payé (`return 403`), soit supprimer le bloc et le remplacer par un `// TODO: journal`.

---

## 🟡 Mineur (DRY, types)

### [DRY-01] `eventDrop` et `eventResize` toujours dupliqués — `AppointmentScheduler.tsx`
Les deux handlers partagent exactement le même corps `fetch PUT /api/appointments` (~30 lignes).
**Correction :** Extraire une fonction `updateAppointmentTiming(event, revert)`.

### [TYPE-01] Type local `InitialData` duplique `InitialAppointmentData` — `AppointmentModal.tsx`
Type local structurellement identique à `InitialAppointmentData` de `@/types/models`. Divergence silencieuse.
**Correction :** Remplacer par import depuis `@/types/models`.

### [TYPE-02] `organizationId` narrowé avec `as string` dans tous les handlers
Cast `as string` après guard. Non bloquant mais peut masquer des régressions de typage futures.
**Correction :** Utiliser `session.user.organizationId!` ou un type guard centralisé.

### [TYPE-03] Catch variable inutilisée — `appointments/route.ts` l. 204
```ts
} catch (e) {
  // pas de body -> ok
}
```
La variable `e` n'est pas utilisée. Utiliser `catch { }` (sans paramètre).

### [CLEAN-03] `extras` et `soldProducts` sérialisés deux fois dans GET — `appointments/route.ts` l. 66–75
`parseJsonField` est appelé deux fois : une fois au niveau racine du JSON retourné, et une seconde fois dans `extendedProps`. Cela double le parsing pour chaque rendez-vous.
**Correction :** Stocker le résultat dans une variable locale et le réutiliser.

### [PERF-03] `include: { service: true, customer: true }` en GET — `appointments/route.ts` l. 42
Le GET appointments utilise `include` qui récupère **tous** les champs des tables `service` et `customer` (couleurs, prix, descriptions, etc.) alors que seul un sous-ensemble est nécessaire.
**Correction :** Remplacer par `select` ciblé pour réduire le payload DB et réseau.

---

## ✅ Points positifs (maintenus)

- **Anti-IDOR** : chaque handler filtre par `organizationId`. PUT et service lookup sont désormais scoped.
- **XSS supprimé** : tippy n'utilise plus `allowHTML`, les données sont échappées via `textContent`.
- **Transaction checkout** : `prisma.$transaction` garantit la cohérence stock/RDV.
- **Zod** : tous les inputs POST/PUT sont validés — `CreateAppointmentSchema`, `UpdateAppointmentSchema`, `CheckoutInputSchema`.
- **AbortController** : les fetches d'agenda peuvent être annulés lors de la navigation rapide.
- **`pad` au niveau module** : plus de réallocation à chaque appel du service.
- **JSON parsing robuste** : `SoldLine` typé, `Array.isArray` guard, catch silencieux pour backward compat.
- **Clé React stable** : `key={p.productId}` pour les lignes produits vendus.
- **`QuickAppointmentModal` unifié** : reload des données à l'ouverture, même composant que l'agenda.

---

## Récapitulatif des priorités restantes

| ID | Sévérité | Fichier | Action |
|----|----------|---------|--------|
| BUG-01 | 🟠 | `customers/route.ts` + `schemas/customers.ts` | Étendre schema PUT (firstName, lastName, phone) |
| BUG-03 | 🟠 | `appointments/route.ts` | `deleteMany` avec `organizationId` |
| BUG-04 | 🟠 | `appointments/route.ts` | Bloquer ou supprimer le bloc `if` vide PAID |
| DRY-01 | 🟡 | `AppointmentScheduler.tsx` | Extraire `updateAppointmentTiming` |
| TYPE-01 | 🟡 | `AppointmentModal.tsx` | Utiliser `InitialAppointmentData` depuis `@/types/models` |
| TYPE-02 | 🟡 | routes | Type guard propre pour `organizationId` |
| TYPE-03 | 🟡 | `appointments/route.ts` | Supprimer paramètre `e` du catch |
| CLEAN-03 | 🟡 | `appointments/route.ts` | Éviter double `parseJsonField` |
| PERF-03 | 🟡 | `appointments/route.ts` | `select` ciblé sur GET au lieu de `include` complet |

