# 🧪 Next.js Code Review Report - V4

**Date :** 2026-04-07
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Audit post-features (Auth.js v5 migration, Dashboard dénormalisé, dailyTarget, Settings UI)
**Baseline :** V3 → 82/100 ⚠️ CHANGES REQUIRED

---

## 🧾 Summary

- **Score :** 17/100
- **Verdict :** ❌ BLOCK
- **Stats :** Critical: 1 | Major: 4 | Minor: 6

> **Contexte :** Régression sévère par rapport à V3. Les nouvelles features introduisent un bug financier critique (données CA sur mauvaise période), orphelinent le test proxy, et propagent les violations `any` dans les nouveaux composants. L'architecture Auth.js v5 est correcte en soi mais son intégration brise la suite de tests.

---

## 🔴 Critical Issues (Blocking)

### [DATA] Signature mismatch dans `dashboard.service.ts` → Dashboard CA toujours sur "30days" quel que soit l'onglet

**Fichiers concernés :**
- `src/services/dashboard.service.ts` L13 — signature : `getDashboardForOrg(orgId: string, period: string = "30days")`
- `src/app/api/stats/route.ts` L55 — appel : `getDashboardForOrg(orgId, { start: startDate, end: endDate })`
- `src/app/api/stats/dashboard/route.ts` L18 — appel : `getDashboardForOrg(orgId, { start, end })`

**Violation :** `global-rules.md` — "bug de paiement/compteur". Les deux routes API passent un objet `{ start, end }` là où la fonction attend une `string` (`"today"` | `"week"` | `"month"` | `"30days"`). Le `switch(period)` ne matche aucun case → fallback silencieux sur `"30days"` pour **toutes les requêtes avec dates personnalisées**. Le CA affiché dans le dashboard est **toujours celui des 30 derniers jours**, peu importe l'onglet sélectionné.

**Impact :** L'utilisateur croit voir son CA du jour ou de la semaine ; il voit en réalité les 30 derniers jours. Faux pilotage financier.

**Fix pour l'AutoFixer :** Unifier la signature. Deux approches possibles — choisir l'une :

**Option A (recommandée) — aligner les routes sur la signature existante :**
```typescript
// src/app/api/stats/route.ts & src/app/api/stats/dashboard/route.ts
// Remplacer :
const stats = await dashboardService.getDashboardForOrg(orgId, { start: startDate, end: endDate })
// Par :
const period = url.searchParams.get('period') ?? '30days'
const stats = await dashboardService.getDashboardForOrg(orgId, period)
```

**Option B — étendre la signature du service pour accepter les deux formes :**
```typescript
// src/services/dashboard.service.ts
type PeriodParam = string | { start?: Date; end?: Date }
export async function getDashboardForOrg(orgId: string, periodOrRange: PeriodParam = "30days") {
  // Si objet, override start/end directement après le switch
}
```

---

## 🟠 Major Issues

### [TYPES] `src/auth.ts` — 4 violations `any` documentées mais non conformes

**Lignes :** 27, 29, 34, 36
**Problem :**
```typescript
async jwt({ token, user }: any)              // L27 — any interdit
token.organizationId = (user as any).organizationId  // L29
async session({ session, token }: any)       // L34 — any interdit
;(session.user as any).organizationId = ...  // L36
```
Le commentaire justificatif ("aligns with NextAuth v5 callback signatures") est insuffisant — `global-rules.md` exige un typage strict ou une déclaration dans `@/types/`.

**Fix :**
```typescript
// src/types/next-auth.d.ts — à créer
import 'next-auth'
declare module 'next-auth' {
  interface User { organizationId?: string | null; role?: string }
  interface Session { user: { organizationId?: string | null; role?: string } & DefaultSession['user'] }
}
declare module 'next-auth/jwt' {
  interface JWT { organizationId?: string | null; role?: string }
}

// src/auth.ts — callbacks typés, zéro any
async jwt({ token, user }) {
  if (user?.organizationId) token.organizationId = user.organizationId
  if (user?.role) token.role = user.role
  return token
},
async session({ session, token }) {
  if (session.user) {
    session.user.organizationId = token.organizationId ?? null
    session.user.role = token.role ?? 'USER'
  }
  return session
},
```

---

### [TESTS] `test/proxy.spec.ts` — Suite de tests orpheline, 0/3 tests passent

**Violation :** `global-rules.md` — "Non-Régression : aucun agent n'a le droit de modifier un test existant pour faire passer son code."

**Problem :**
1. Le test mocke `../src/lib/nextAuthAdapter` → ce module a été **supprimé** lors de la migration Auth.js v5. Le mock ne peut jamais s'instancier.
2. Le test importe `{ middleware }` depuis `../src/middleware` → `src/middleware.ts` n'exporte qu'un **default**, pas d'export nommé `middleware`.
3. Résultat : la suite `proxy.spec.ts` échoue en import, bloquant le runner sur ce fichier.

**Fix :** Le code source doit être adapté pour que le test puisse fonctionner SANS modifier le test :
```typescript
// src/lib/nextAuthAdapter.ts — recréer comme thin-wrapper mocquable
export async function getTokenFromRequest(req: unknown): Promise<Record<string, unknown> | null> {
  // Délègue à auth() de next-auth v5
}
export async function getTypedServerSession(): Promise<Record<string, unknown> | null> {
  // Délègue à auth()
}
const nextAuthAdapter = { getTokenFromRequest, getTypedServerSession }
export default nextAuthAdapter

// src/middleware.ts — ajouter l'export nommé attendu par le test
export { middleware } // en plus du default
```

---

### [TYPES] `src/services/analytics.service.ts` — Code mort + 5 violations `any`

**Problem :**
1. `getOrgDashboard` (L35–95) **duplique exactement** `getDashboardForOrg` de `dashboard.service.ts`. Code mort non supprimé.
2. 5 occurrences de `(price as any)?.toNumber` et `a.startTime as any`, en violation directe de `global-rules.md`.
3. `getOrgStats` (L5) ignore `status` et les champs `finalPrice`/`PAID` → calcule un CA incorrect.

**Fix :** Supprimer `getOrgDashboard` entièrement. Refactorer `getOrgStats` :
```typescript
// Remplacer (price as any)?.toNumber par :
const priceVal = typeof (price as { toNumber?: () => number })?.toNumber === 'function'
  ? (price as { toNumber: () => number }).toNumber()
  : Number(price ?? 0)
```

---

### [DATA] `src/components/settings/FinanceSettings.tsx` — `dailyTarget` non chargé au montage

**Ligne :** 8 — `const [target, setTarget] = useState(0)` 

**Problem :** Le formulaire démarre toujours à `0` même si l'organisation a un objectif défini. L'utilisateur qui ouvre la page Settings voit `0 €`, croit que la valeur est réinitialisée, et peut écraser par accident sa configuration. La route `GET /api/organization/settings` existe mais n'est jamais appelée.

**Fix :**
```typescript
useEffect(() => {
  fetch('/api/organization/settings')
    .then(r => r.json())
    .then(data => { if (typeof data.dailyTarget === 'number') setTarget(data.dailyTarget) })
    .catch(() => {}) // silencieux : state reste à 0 par défaut
}, [])
```

---

## 🟡 Minor Issues

1. **`src/services/dashboard.service.ts` (L46–47)** — Clé `startTime` dupliquée dans l'objet `where` : `startTime: { gte: start }` est immédiatement écrasée par `startTime: { gte: start, lte: end }`. La première ligne est morte. Supprimer L46.

2. **`src/app/(dashboard)/settings/layout.tsx` (L13)** — Onglet `"Mon Compte"` pointe vers `/settings/profile` — page inexistante → 404 garanti. Désactiver ou créer la page.

3. **`src/app/dashboard/page.tsx` (L17)** — `redirect("/login")` → la page de login est à `/auth/signin`. Incohérence de routing.

4. **`src/components/dashboard/DashboardCharts.tsx` (L35)** — Faute typographique : `"Chiffre d affaires"` → `"Chiffre d'affaires"`.

5. **`src/app/api/appointments/route.ts` (L85, L101)** et **`src/app/api/packages/route.ts` (L25, L41)** — `console.log` / `console.error` directs, non passés par `logger`. Issue **non résolue depuis V3**.

6. **`src/app/api/organization/settings/route.ts` (L27–29, PATCH)** — Validation manuelle (`Number.isNaN`) sans schéma Zod. Violation de `global-rules.md` ("Toute donnée provenant de l'extérieur doit être validée par un schéma Zod").

---

## 🧠 Global Recommendations

1. **Signature unifiée du service dashboard** : décider d'une interface unique (`period: string` vs `{ start, end }`) et l'appliquer à toutes les routes. Actuellement `/api/stats` et `/api/stats/dashboard` font doublon — envisager de n'en garder qu'une.

2. **`src/types/next-auth.d.ts`** : créer ce fichier une bonne fois pour toutes et supprimer tous les `as any` dans `auth.ts`. C'est la solution recommandée par la doc Next-Auth v5.

3. **`analytics.service.ts`** : si conservé pour les tests unitaires, le nettoyer (retirer `getOrgDashboard`, corriger les `any`). Sinon le supprimer et pointer les tests vers `dashboard.service.ts`.

4. **Test coverage** : `proxy.spec.ts` doit redevenir vert. La priorité est de recréer `nextAuthAdapter.ts` comme adapter mocquable. Le middleware garde Auth.js v5 sous le capot mais expose les primitives testables.

5. **`FinanceSettings.tsx`** : convertir en composant hybride (Server → `initialValue` en prop + Client) pour éviter le fetch côté client au montage. Pattern Next.js App Router recommandé.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Corriger le bug financier (🔴 Critical)
- `src/services/dashboard.service.ts` OU `src/app/api/stats/route.ts` + `src/app/api/stats/dashboard/route.ts` : aligner les signatures (Option A recommandée).

### Priorité 2 — Restaurer les tests (🟠 Major)
- Recréer `src/lib/nextAuthAdapter.ts` (thin-wrapper Auth.js v5).
- Ajouter `export { middleware }` dans `src/middleware.ts`.
- Vérifier que `pnpm test` passe à **3/3 suites**.

### Priorité 3 — Typage strict (🟠 Major)
- Créer `src/types/next-auth.d.ts`.
- Refactorer `src/auth.ts` pour zéro `any`.
- Refactorer `src/services/analytics.service.ts` : supprimer les `any` + supprimer `getOrgDashboard` (dead code).

### Priorité 4 — Data integrity (🟠 Major)
- `src/components/settings/FinanceSettings.tsx` : ajouter le `useEffect` de chargement initial.

### Priorité 5 — Clean Code (🟡 Minor)
- `dashboard.service.ts` L46 : supprimer la clé `startTime` dupliquée.
- `settings/layout.tsx` : corriger le lien `/settings/profile`.
- `dashboard/page.tsx` : corriger le `redirect`.
- `DashboardCharts.tsx` : corriger la typographie.
- Routes API : remplacer `console.log/error` par `logger`.
- `settings/route.ts` PATCH : ajouter un schéma Zod.

---

## 🧮 Final Decision

**❌ BLOCK**

Score calculé : 100 − 1×25 − 4×10 − 6×3 = **17/100**

Le projet est sécurisé côté IDOR (tous les accès Prisma sont scopés `organizationId`) et l'authentification Auth.js v5 fonctionne. Cependant, le dashboard financier affiche des données erronées (régression critique sur le filtrage par période), la suite de tests est cassée à 33%, et la dette en `any` a augmenté avec les nouvelles features. L'AutoFixer doit traiter les 5 priorités dans l'ordre avant toute mise en production.

