# 🧪 Next.js Code Review Report - V27

> **Scope :** Branche `fix/autofixer-v26` vs `main` — vérification post-AutoFixer V26
> **Fichiers audités :** `src/types/models.ts`, `src/services/unavailability.service.ts`, `src/app/api/unavailability/route.ts`, `src/components/calendar/AppointmentModal.tsx`, `src/components/calendar/UnavailabilityModal.tsx`, `src/components/AppointmentScheduler.tsx`

---

## 🧾 Summary
- **Score:** 91/100
- **Verdict:** ✅ APPROVED (avec 3 mineurs à corriger en suivi)
- **Stats:** Critical: 0 | Major: 0 | Minor: 3

---

## ✅ Corrections confirmées depuis V26 (AutoFixer)

| Issue V26 | Statut |
|---|---|
| `as any` dans `AppointmentModal.tsx:284` | ✅ CORRIGÉ — `selectedRange?.start` type-safe |
| `type CustomerPackage` inline → `@/types/models.ts` | ✅ CORRIGÉ — `CustomerPackageSummary` centralisé |
| `Recurrence` + constantes dupliquées | ✅ CORRIGÉ — `RECURRENCE_OPTIONS`, `Recurrence`, `RECURRENCE_LABELS` dans `@/types/models.ts` |
| `buildOccurrences` dans handler API | ✅ CORRIGÉ — `src/services/unavailability.service.ts` créé |
| `as string` casts `organizationId` | ✅ CORRIGÉ — `!` non-null assertion |
| `catch {}` silencieux `fetchUnavailabilities` | ✅ CORRIGÉ — `clientError` log ajouté |
| `(c as CustomerType)` redondant | ✅ CORRIGÉ — cast supprimé |

---

## 🔴 Critical Issues
_Aucune._

## 🟠 Major Issues
_Aucune._

---

## 🟡 Minor Issues

### [TYPE-SAFETY] `as CustomerPackageSummary[]` sans validation Zod — `AppointmentModal.tsx`
**Problème :** `(data || []) as CustomerPackageSummary[]` — le retour de `res.json()` est casté directement sans vérification de forme. En cas de changement silencieux de l'API `/api/customers/:id/packages`, le type serait incorrect sans erreur runtime.
**Fix suggéré :** Ajouter un schéma Zod léger pour parser la réponse :
```ts
const CustomerPackageSchema = z.object({ id: z.string(), sessionsRemaining: z.number(), ... })
const result = z.array(CustomerPackageSchema).safeParse(data)
if (result.success) setCustomerPackages(result.data)
```
Priorité faible — données lues en lecture seule, aucune mutation.

### [ARCHITECTURE] `WhereClause` type inline dans `route.ts`
**Problème :** `type WhereClause = { organizationId: string; AND?: ... }` défini localement dans le handler GET. Mineur — type trivial, pas de duplication pour l'instant, mais à déplacer dans `unavailability.service.ts` si la logique de filtre est réutilisée.
**Fix :** Déplacer dans `src/services/unavailability.service.ts` ou laisser en place tant qu'il n'est pas dupliqué.

### [TESTS] Aucun test unitaire pour `buildOccurrences`
**Problème :** `src/services/unavailability.service.ts` est la logique métier critique (génération des séries récurrentes), mais n'a aucun test Vitest. Un bug dans l'algo (ex: dépassement du `maxDate`, calcul `MONTHLY` en fin de mois) passerait inaperçu.
**Fix :** Créer `test/unavailability.service.spec.ts` avec des cas : NONE, WEEKLY (vérifier 26 occurrences), BIWEEKLY, MONTHLY, et un cas limite (start = 30 janvier → mois de 28/29 jours).

---

## 🧠 Global Recommendations

1. **Test de `buildOccurrences`** — priorité recommandée avant le merge en prod. Logique de date sensible aux fins de mois.
2. **Zod sur les réponses API côté client** — pattern à appliquer systématiquement sur tous les `res.json() as SomeType`. Cible : `AppointmentScheduler`, `AppointmentModal`, `UnavailabilityModal`.
3. **TODO.md** — ajouter la suppression des fallbacks `productsTotal` dans `dashboard.service.ts` (colonnes stables en prod depuis plusieurs semaines).

---

## 🧩 Refactoring Plan (Optionnel — sprint suivant)

1. Test unitaire `buildOccurrences` dans `test/unavailability.service.spec.ts`.
2. Zod parsing sur `res.json()` dans `AppointmentModal` pour `customerPackages`.
3. Nettoyage fallbacks `productsTotal` dans `dashboard.service.ts` (cf. TODO.md).

---

## 🧮 Final Decision

**✅ APPROVED** — Score 91/100. Zéro critical, zéro major. Les 3 mineurs sont de la dette technique légère et n'impactent pas la sécurité ni la stabilité. La branche `fix/autofixer-v26` est **mergeable en `main`**.

