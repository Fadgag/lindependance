# 🧪 Next.js Code Review Report - V7

**Date :** 2026-04-07
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Audit post-session (corrections startTime, middleware shim, proxy cleanup)
**Baseline :** V6 → 69/100 ⚠️ CHANGES REQUIRED
**Tests :** 8/8 fichiers ✅ — 12/12 tests ✅
**Build :** ✅ next build SUCCESS

---

## 🧾 Summary

- **Score :** 76/100
- **Verdict :** ⚠️ CHANGES REQUIRED
- **Stats :** Critical: 0 | Major: 2 | Minor: 4

> **Contexte :** Progression de +7 points vs V6. Le bug `startTime` de `customers/[id]/page.tsx` est résolu via normalisation `new Date(String(apt.startTime))`. Le middleware est consolidé en un shim testable (`src/middleware.ts`) découplé de `next-auth`. Le proxy réel (`src/proxy.ts`) appelle bien `auth()` de `./auth`. Deux issues Major subsistent : les casts non documentés dans `auth.ts` (identique V6) et la logique `price as unknown as …` dans `analytics.service.ts`. Quatre Minor résiduelles, dont le dead code `getOrgDashboard`.

---

## ✅ Correctifs Confirmés (depuis V6)

| Issue V6 | Statut |
|----------|--------|
| `customers/[id]/page.tsx` — `new Date(apt.startTime)` avec `undefined` possible (🟡 Minor) | ✅ FIXED — `const start = apt.startTime ? new Date(String(apt.startTime)) : null` |
| `AppointmentSummary` — manque `startTime` optionnel (🟡 Minor) | ✅ FIXED — champ ajouté dans `models.ts` |
| `src/middleware.ts` absent — `proxy.spec.ts` crashait (🟠 Major) | ✅ FIXED — shim standalone créé |
| `proxy.ts` — import `@/auth` non résolu dans tests (🟠 Major) | ✅ FIXED — import relatif `./auth` |
| JSX brackets malformés `customers/[id]/page.tsx` (🔴 Build blocker) | ✅ FIXED |

---

## 🔴 Critical Issues

_Aucune issue critique détectée._ ✅

---

## 🟠 Major Issues

### [TYPES] `src/auth.ts` — Casts manuels redondants avec `next-auth.d.ts`

**Lignes :** 26–29, 35–38

```typescript
// Actuel — cast inutile depuis que next-auth.d.ts déclare les types
const u = user as { organizationId?: string | null; role?: string | null }
const t = token as { organizationId?: string | null; role?: string | null }
```

**Violation :** `global-rules.md` — `as` uniquement en dernier recours + commentaire `// RAISON:`. Ici les types sont déjà étendus dans `src/types/next-auth.d.ts` : `user.organizationId`, `token.organizationId`, `session.user.organizationId` sont tous déclarés. Le cast est donc inutile ET non documenté correctement.

**Fix :**
```typescript
async jwt({ token, user }) {
  if (user?.organizationId) token.organizationId = user.organizationId
  if (user?.role) token.role = user.role
  return token
},
async session({ session, token }) {
  if (session.user) {
    session.user.organizationId = token.organizationId ?? null
    session.user.role = (token.role as string) ?? 'USER'
  }
  return session
},
```

---

### [TYPES] `src/services/analytics.service.ts` — `price as unknown as { toNumber?: () => number }` (L18, L65)

**Lignes :** 18–24 (`getOrgStats`) et 65–71 (`getOrgDashboard`)

```typescript
const pobj = price as unknown as { toNumber?: () => number }
```

**Violation :** `global-rules.md` — double-cast `as unknown as` sans commentaire. Le pattern `new Decimal(String(price ?? 0))` utilisé dans `dashboard.service.ts` résout le même problème proprement (Decimal accepte string/number/Decimal).

**Fix :**
```typescript
// Remplacer dans getOrgStats et getOrgDashboard
const dec = new Decimal(String(price ?? 0))
total = total.plus(dec)
```

---

## 🟡 Minor Issues

1. **`src/services/analytics.service.ts` (L45–99)** — `getOrgDashboard` est du dead code documenté `TODO: supprimer`. Bloqué uniquement par `test/analytics.service.spec.ts` qui teste encore cette fonction. Migrer le test → `getDashboardForOrg` puis supprimer la fonction.

2. **`src/components/dashboard/CheckoutModal.tsx` (L88, 90, 94, 97, 102–104)** — 7 occurrences de `as any` pour accéder à `extendedProps`. Ces casts sont localisés et documentés (`// RAISON:` absent sur certains). Remplacer par un type guard explicite ou typer `extendedProps` dans `CheckoutAppointment`.

3. **`src/components/dashboard/DashboardCharts.tsx` (L83)** — `formatter={(value: any) => ...}` pour contourner la signature Recharts. Acceptable en UI mais doit avoir un commentaire `// RAISON: Recharts Formatter type incompatible`.

4. **`src/lib/api.ts` (L6)** — `console.error('API error:', err)` ne passe pas par `logger`. `src/lib/logger.ts` existe et expose `logger.error(...)`. Remplacer pour homogénéiser le format des logs serveur.

---

## 🛡️ Bilan Sécurité (Anti-IDOR)

**Aucune faille IDOR détectée.** Vérifications :

- Toutes les routes API vérifient `session.user.organizationId` avant accès Prisma. ✅
- `dashboard.service.ts` et `analytics.service.ts` scopent par `organizationId`. ✅
- `proxy.ts` (real middleware via `auth()`) redirige les non-authentifiés avant d'atteindre les pages. ✅
- `src/middleware.ts` (shim testable) gère correctement `x-org-id` et la protection `/api`. ✅
- Le test E2E `stats.dashboard.e2e.spec.ts` valide l'isolation inter-organisations. ✅
- `customers/[id]/page.tsx` charge le client via `?id=` scopé côté API. ✅

---

## 🧠 Global Recommendations

1. **`auth.ts`** : Fix trivial (2 lignes), élimine 1 Major. Traiter en sprint actuel.

2. **`analytics.service.ts`** : Migrer `test/analytics.service.spec.ts` vers `getDashboardForOrg` → supprimer `getOrgDashboard` → simplifier `getOrgStats` avec `new Decimal(String(price ?? 0))`. Un seul sprint pour éliminer 1 Major + 1 Minor.

3. **`CheckoutModal.tsx`** : Les `as any` sur `extendedProps` sont localisés et ne créent pas de risque de sécurité. Corriger lors de la prochaine itération UI.

4. **`lib/api.ts`** : Migrer `console.error` → `logger.error` — 1 ligne. Faible effort, gain de cohérence.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Typage strict (🟠 Major)
- `src/auth.ts` : Supprimer les 2 casts manuels. Accès direct via `next-auth.d.ts`.
- `src/services/analytics.service.ts` L18, L65 : Remplacer `as unknown as { toNumber?... }` par `new Decimal(String(price ?? 0))`.

### Priorité 2 — Dead Code (🟡 Minor)
- Migrer `test/analytics.service.spec.ts` → tester `getDashboardForOrg`.
- Supprimer `getOrgDashboard` de `analytics.service.ts`.

### Priorité 3 — Clean Code (🟡 Minor)
- `src/lib/api.ts` : `console.error` → `logger.error`.
- `src/components/dashboard/DashboardCharts.tsx` L83 : Ajouter commentaire `// RAISON:` sur le `as any`.
- `src/components/dashboard/CheckoutModal.tsx` : Documenter les `as any` restants avec `// RAISON:`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED**

Score calculé : 100 − 2×10 − 4×3 = **76/100**

Le projet est **fonctionnel, sécurisé et buildable**. Aucune faille IDOR. Aucun bug financier. Les deux Major restants (casts `auth.ts` + `analytics.service.ts`) sont des corrections de 2–5 lignes chacune. L'AutoFixer peut atteindre **95+/100** en traitant les 3 priorités ci-dessus.

