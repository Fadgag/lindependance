# 🧪 Next.js Code Review Report - V8

> **Date :** 2026-04-10
> **Scope :** Audit post-autofixer V7 — branche `feature/mobile-navigation`
> **Baseline :** V7 (score 68/100 — CHANGES REQUIRED → autofixer appliqué)

---

## 🧾 Summary

- **Score:** 81/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 3
- **Progression vs V7 post-fix :** +13 pts nets (régression corrigée + nouvelles issues de fond détectées)

---

## ✅ Points résolus depuis V7

| Item V7 | Statut |
|---|---|
| 🟠 `src/proxy.ts` — TS2339 `auth` inexistant sur `NextRequest` | ✅ Corrigé — `NextAuthRequest` depuis `next-auth` |
| 🟠 `users/route.ts` — bcrypt `10` hardcodé | ✅ Corrigé — `BCRYPT_ROUNDS` importé |
| 🟡 `api.ts` — `console.error` hors lib | ✅ Corrigé — `logger.error` |
| 🟡 `AppointmentScheduler.tsx` — 5 `alert()` | ✅ Corrigés — `toast.error()` |
| 🟡 `AppointmentModal.tsx` — 4 `alert()` | ✅ Corrigés — `toast.error()` |
| 🟡 `analytics.service.ts` — cast sans RAISON | ✅ Commentaire `// RAISON:` ajouté |
| TypeScript `tsc --noEmit` (src/) | ✅ **0 erreur** |
| Tests (Vitest) | ✅ **11/11** (1 E2E skippé) |
| `as any` dans le code source | ✅ **0** |
| `console.*` hors `lib/` | ✅ **0** |
| `alert()` dans composants | ✅ **0** |

---

## 🔴 Critical Issues (Blocking)

_Aucune. Zéro IDOR confirmé sur toutes les routes._

---

## 🟠 Major Issues

### [OBSERVABILITÉ] `src/app/api/stats/dashboard/route.ts` — Erreur silencieuse en prod

**Fichier :** `src/app/api/stats/dashboard/route.ts` L20-22

**Problem :**
```ts
// ❌ catch muet — erreur perdue, aucune trace en prod
} catch (err) {
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

Contrairement à toutes les autres routes du projet qui utilisent `apiErrorResponse(err)` (qui appelle `logger.error`), cette route swallow silencieusement toute exception. En production, une panne de Prisma ou du service dashboard est invisible dans les logs.

**Impact :** Opaque en prod — impossible de diagnostiquer les pannes du dashboard. Viole la règle `global-rules.md` "Pas de Logs de Debug" (par extension : les erreurs serveur doivent être loggées).

**Fix :**
```ts
import apiErrorResponse from '@/lib/api'
// ...
} catch (err) {
  return apiErrorResponse(err)
}
```

---

## 🟡 Minor Issues

### 1. `src/components/calendar/AppointmentModal.tsx` — 461 lignes (seuil global-rules : 200)

**Règle violée :** `global-rules.md` — "composants < 200 lignes, logique métier hors de l'UI".

Le composant combine :
- Logique de fetch des forfaits clients (lignes 130-160)
- Logique de calcul horaire / validation (lignes 165-185)
- Logique de sauvegarde + suppression (lignes 220-320)
- Rendu JSX (lignes 330-461)

**Fix recommandé :**
- Extraire `useCustomerPackages(customerId, serviceId)` → `src/hooks/useCustomerPackages.ts`
- Extraire `useAppointmentForm(initialData, selectedRange)` → `src/hooks/useAppointmentForm.ts`
- Le composant ne devrait contenir que le JSX + les appels aux hooks

### 2. Casts `as` sans commentaire `// RAISON:` dans 4 fichiers

| Fichier | Ligne | Cast |
|---|---|---|
| `src/app/api/staff/route.ts` | L12 | `(staff as StaffRow[])` |
| `src/components/calendar/AppointmentModal.tsx` | L97 | `(c as CustomerType).id` |
| `src/components/calendar/AppointmentModal.tsx` | L116 | `selectedRange as DateSelectArg` |
| `src/components/calendar/AppointmentModal.tsx` | L152 | `(data || []) as CustomerPackage[]` |

**Fix :** Ajouter `// RAISON:` sur chacun :
- `staff/route.ts` → `// RAISON: Prisma retourne StaffRow[] — type local aligné sur la sélection Prisma`
- `AppointmentModal.tsx L97` → `// RAISON: customers est CustomerType[] — cast nécessaire car find() reçoit le type générique`
- `AppointmentModal.tsx L116` → `// RAISON: selectedRange est passé comme DateSelectArg depuis FullCalendar`
- `AppointmentModal.tsx L152` → `// RAISON: API retourne CustomerPackage[] — res.json() est unknown`

### 3. `src/app/api/stats/dashboard/route.ts` — Dates non validées via Zod

```ts
// Validation absente : new Date("garbage") crée un Invalid Date silencieux
const start = startParam ? new Date(startParam) : undefined
const end = endParam ? new Date(endParam) : undefined
```

Contrairement à `stats/route.ts` qui valide les params avec `z.object({ start: z.string().optional(), end: z.string().optional() })`, `stats/dashboard/route.ts` ne fait aucune validation des searchParams. Une date invalide produit un `Invalid Date` qui corrompt silencieusement les requêtes Prisma.

**Fix :**
```ts
const paramsSchema = z.object({
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
})
const params = paramsSchema.safeParse({
  start: url.searchParams.get('start') ?? undefined,
  end: url.searchParams.get('end') ?? undefined,
})
if (!params.success) return NextResponse.json({ error: 'Invalid date params' }, { status: 400 })
const start = params.data.start ? new Date(params.data.start) : undefined
const end = params.data.end ? new Date(params.data.end) : undefined
```

---

## 🧠 Global Recommendations

1. **`AppointmentModal.tsx` refactoring** : La décomposition en hooks personnalisés est la priorité architecture pour descendre sous 200 lignes. C'est la plus grande dette technique UI du projet.

2. **Uniformiser le pattern error-handler** : `stats/dashboard/route.ts` était la seule route sans `apiErrorResponse`. Après ce fix, 100% des routes utiliseront `logger.error` via `apiErrorResponse` — pattern cohérent.

3. **Ajouter `tsconfig.tsbuildinfo` au `.gitignore`** (recommandation V7 ouverte) : le cache stale avait généré 21 fausses erreurs TS en cascade.

4. **E2E** : Activer un job GitHub Actions avec Postgres 16.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Major 🟠
- **`src/app/api/stats/dashboard/route.ts`** : Remplacer `catch (err) { return NextResponse.json(...) }` par `return apiErrorResponse(err)`. Ajouter import `apiErrorResponse`.

### Priorité 2 — Minors 🟡
- **`src/app/api/stats/dashboard/route.ts`** : Ajouter validation Zod sur `startParam`/`endParam`.
- **`src/app/api/staff/route.ts`** L12 : Ajouter `// RAISON:` sur le cast `as StaffRow[]`.
- **`src/components/calendar/AppointmentModal.tsx`** L97, L116, L152 : Ajouter `// RAISON:` sur les 3 casts.

> Note : Le refactoring de `AppointmentModal.tsx` (461 → <200 lignes) est une tâche `/builder` dédiée, pas un autofixer one-shot.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **81/100** (+13 vs V7 post-autofixer estimé à ~92 → réévaluation sur base 100 à froid).

0 IDOR · 0 `as any` · 0 `alert()` · 0 `console.*` hors lib · TypeScript **0 erreur src/** · 11/11 tests.
1 Major : `stats/dashboard/route.ts` — erreur swallowed, invisible en prod.
3 Minors : taille AppointmentModal (461L), 4 casts sans RAISON, dates non validées dans dashboard route.

Lance `/autofixer` pour corriger le Major + les 3 Minors rapides et atteindre **95+/100**.

