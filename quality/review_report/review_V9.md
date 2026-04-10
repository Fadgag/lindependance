# 🧪 Next.js Code Review Report - V9

> **Date :** 2026-04-10
> **Scope :** Audit post-autofixer V8 — branche `feature/mobile-navigation`
> **Baseline :** V8 (score 81/100 — autofixer appliqué)

---

## 🧾 Summary

- **Score:** 85/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 0 | Minor: 5
- **Progression vs V8 :** +4 pts

---

## ✅ Points résolus depuis V8

| Item V8 | Statut |
|---|---|
| 🟠 `stats/dashboard/route.ts` — catch muet, erreur swallowed | ✅ `apiErrorResponse(err)` + `logger.error` |
| 🟡 `stats/dashboard/route.ts` — dates non validées par Zod | ✅ `z.string().refine(isNaN(new Date(v)))` |
| 🟡 `staff/route.ts` — cast `as StaffRow[]` sans RAISON | ✅ `// RAISON:` ajouté |
| 🟡 `AppointmentModal.tsx` L97/L116/L152 — 3 casts sans RAISON | ✅ `// RAISON:` ajoutés |
| `api.ts` — import `@/lib/logger` non résolu par Vitest | ✅ Import relatif `./logger` |
| TypeScript `tsc --noEmit` (src/) | ✅ **0 erreur** |
| Tests (Vitest) | ✅ **11/11** (1 E2E skippé) |
| `as any` | ✅ **0** |
| `console.*` hors `lib/` | ✅ **0** |
| `alert()` | ✅ **0** |

---

## 🔴 Critical Issues (Blocking)

_Aucune._
> Note : les routes `/api/auth/*` (sans `organizationId`) sont des endpoints publics d'authentification — absence d'org-scoping normale et intentionnelle.

---

## 🟠 Major Issues

_Aucune._

---

## 🟡 Minor Issues

### 1. `src/components/dashboard/CheckoutModal.tsx` — 237 lignes (seuil : 200) + 4 casts `as Extra[]` sans `// RAISON:`

**Taille :** 237 lignes > seuil 200 de `global-rules.md`.

**Casts sans RAISON** dans `extractExtras` :
```ts
// L91 — JSON.parse sans RAISON
try { return JSON.parse(val) as Extra[] } catch { return [] }
// L93 — Array.isArray sans RAISON
if (Array.isArray(val)) return val as Extra[]
// L99 — JSON.parse fallback sans RAISON
try { return JSON.parse(ext) as Extra[] } catch { return [] }
// L101 — Array.isArray fallback sans RAISON
if (Array.isArray(ext)) return ext as Extra[]
```

**Fix :** Ajouter une ligne de commentaire `// RAISON:` avant chaque bloc :
```ts
// RAISON: JSON.parse retourne unknown — shape Extra[] garantie par le contrat API (extras sérialisés côté serveur)
try { return JSON.parse(val) as Extra[] } catch { return [] }
// RAISON: Array.isArray vérifie le type runtime — cast vers Extra[] sûr après vérification
if (Array.isArray(val)) return val as Extra[]
```

### 2. `src/components/AppointmentScheduler.tsx` — 253 lignes (seuil : 200)

Légèrement au-dessus du seuil. Le composant inclut :
- Logique de fetch appointments/customers/services/staff (lignes 47-90)
- Handlers drag-and-drop + resize inline (lignes 177-230)
- Configuration FullCalendar (90+ lignes d'options)

**Fix recommandé :** Extraire `useSchedulerData()` → `src/hooks/useSchedulerData.ts` (fetch + state des resources).

### 3. `src/components/calendar/AppointmentModal.tsx` — 464 lignes (seuil : 200)

Récurrent depuis V8. Tâche `/builder` dédiée (extraction `useCustomerPackages` + `useAppointmentForm`).

### 4. `src/components/settings/ServiceManager.tsx` L22 — cast `as ServiceType[]` sans `// RAISON:`

```ts
// ❌ Manque commentaire RAISON
const data = await res.json() as ServiceType[]
```

**Fix :**
```ts
// RAISON: res.json() retourne unknown — shape ServiceType[] garantie par /api/services (Prisma select typé)
const data = await res.json() as ServiceType[]
```

### 5. `src/app/customers/[id]/page.tsx` L12 — cast `useParams() as { id?: string }` sans `// RAISON:`

```ts
// ❌ Manque commentaire RAISON
const params = useParams() as { id?: string }
```

Next.js `useParams()` retourne `ReadonlyURLSearchParams | null` en l'absence de types génériques — le cast est nécessaire pour accéder à `params.id` de manière typée.

**Fix :**
```ts
// RAISON: useParams() retourne un type générique — cast vers shape connue du segment [id] Next.js App Router
const params = useParams() as { id?: string }
```

---

## 🧠 Global Recommendations

1. **Créer un `vitest.config.ts`** avec l'alias `@/` → `./src/` pour éviter les imports relatifs de contournement dans `src/lib/api.ts`. Alignerait le comportement Vitest sur le tsconfig.

2. **Refactoring composants > 200L** : `AppointmentModal` (464L), `AppointmentScheduler` (253L), `CheckoutModal` (237L) — trois tâches `/builder` distinctes pour extraire les hooks métier.

3. **E2E** : Activer un job GitHub Actions avec Postgres 16.

4. **`customers/page.tsx` L27** : `err as { name?: unknown }` dans un bloc `catch` est un pattern acceptable (narrowing d'erreur), mais mérite un `// RAISON:` de cohérence.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Minors 🟡 (autofixer one-shot)
- **`src/components/dashboard/CheckoutModal.tsx`** L91, L93, L99, L101 : Ajouter `// RAISON:` sur les 4 casts `as Extra[]`.
- **`src/components/settings/ServiceManager.tsx`** L22 : Ajouter `// RAISON:` sur `as ServiceType[]`.
- **`src/app/customers/[id]/page.tsx`** L12 : Ajouter `// RAISON:` sur `useParams() as { id?: string }`.
- **`src/app/customers/page.tsx`** L27 : Ajouter `// RAISON:` sur `err as { name?: unknown }`.

### Priorité 2 — Architecture 🏗️ (tâches /builder)
- **`AppointmentModal.tsx`** : Extraire `useCustomerPackages` + `useAppointmentForm`.
- **`AppointmentScheduler.tsx`** : Extraire `useSchedulerData`.
- **Créer `vitest.config.ts`** avec alias `@/`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **85/100** (+4 vs V8).

0 IDOR · 0 Major · 0 `as any` · 0 `alert()` · 0 `console.*` hors lib · TypeScript **0 erreur src/** · 11/11 tests.
5 Minors : 4 casts sans RAISON dans CheckoutModal, 3 composants > 200L (dette architecture), cast sans RAISON ServiceManager + customers/page.

Lance `/autofixer` pour les RAISON manquants → **92+/100**. Les refactorings de taille nécessitent `/builder`.

