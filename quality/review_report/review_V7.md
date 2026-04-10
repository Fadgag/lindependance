# 🧪 Next.js Code Review Report - V7

> **Date :** 2026-04-10
> **Scope :** Audit post-autofixer V6 — branche `feature/mobile-navigation`
> **Baseline :** V6 (score 84/100 — CHANGES REQUIRED)

---

## 🧾 Summary

- **Score:** 68/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 2 | Minor: 4
- **Progression vs V6 :** -16 pts (régression introduite par autofixer-V6 sur proxy.ts + bcrypt non migré dans users/route.ts)

---

## ✅ Points résolus depuis V6

| Item V6 | Statut |
|---|---|
| 🟠 `createAppointmentAction` — conflict check `staffId: undefined` | ✅ Résolu — `assignedStaffId` résolu avant le check |
| 🟡 Casts `as` sans `// RAISON:` dans CheckoutModal | ✅ Commentés |
| 🟡 Casts `as` sans `// RAISON:` dans AppointmentScheduler | ✅ Commentés |
| 🟡 Casts `as` sans `// RAISON:` dans auth.ts | ✅ Commentés |
| TypeScript `tsc --noEmit` (src/) | ✅ 1 seule erreur résiduelle dans proxy.ts |
| Tests (Vitest) | ✅ 11/11 (1 E2E skippé) |
| `as any` dans tout le code source | ✅ 0 |

---

## 🔴 Critical Issues (Blocking)

_Aucune. Zéro IDOR confirmé sur toutes les routes._

---

## 🟠 Major Issues

### [TYPE ERROR] `src/proxy.ts` — Régression TypeScript : `Property 'auth' does not exist on type 'NextRequest'`

**Fichier :** `src/proxy.ts` L9

**Problem :**
Le fichier `src/types/next-server.d.ts` est maintenant **vide** (l'augmentation de type a été supprimée), mais `proxy.ts` accède toujours à `req.auth` via un cast identité `(req as NextRequest).auth` :

```ts
// ❌ Actuel — 'auth' n'existe pas sur 'NextRequest' → TS2339
const authClaim = (req as NextRequest).auth ?? null
```

Sans l'augmentation, `NextRequest` ne possède pas la propriété `auth`. TypeScript lève `error TS2339`.

De plus, la fonction `middlewareFn` est typée `(req: NextRequest)` alors que `auth()` de next-auth v5 attend `(req: NextAuthRequest)`. `NextAuthRequest` étend `NextRequest` et ajoute `auth: Session | null`.

**Note :** Le cache TypeScript (`tsconfig.tsbuildinfo`) amplifie les erreurs en cascade (`NextResponse not found`, `nextUrl not found`) — une fois le cache supprimé, il ne reste que cette unique erreur dans `src/`.

**Impact :**
- Build TypeScript échoue → blocage Vercel CI/CD potentiel.
- `req.auth` sera toujours `undefined` à l'exécution (la propriété n'existe pas), donc `isLoggedIn = false` pour TOUTES les requêtes → toutes les pages redirigent vers `/auth/signin` en production.

**Fix :**

```ts
// ✅ Utiliser NextAuthRequest (next-auth v5) qui étend NextRequest avec auth: Session | null
import { auth } from "./auth"
import type { NextAuthRequest } from 'next-auth'

async function middlewareFn(req: NextAuthRequest) {
  const authClaim = req.auth ?? null  // Session | null — type correct
  const isLoggedIn = !!authClaim
  const isAuthPage = String(req.nextUrl?.pathname ?? '').startsWith("/auth")

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl))
  }
}

export const middleware = auth(middlewareFn)
export default middleware

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

> `src/types/next-server.d.ts` peut rester vide ou être supprimé — l'augmentation n'est plus nécessaire quand on utilise `NextAuthRequest`.

---

### [DRY / BCRYPT] `src/app/api/users/route.ts` — Rounds bcrypt codé en dur `10`

**Fichier :** `src/app/api/users/route.ts` L40

**Problem :**
```ts
// ❌ Hardcoded — contrat de centralisation BCRYPT_ROUNDS rompu
const hashed = await bcrypt.hash(password, 10)
```

`BCRYPT_ROUNDS = 12` est centralisé dans `src/lib/crypto.ts` et utilisé dans `reset-password/route.ts` et `password.service.ts`. La route `/api/users` (création d'admin) utilise encore `10` — incohérence de sécurité : les mots de passe créés via cette route sont moins bien hashés que les autres.

**Fix :**
```ts
import { BCRYPT_ROUNDS } from '@/lib/crypto'
// ...
const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS)
```

---

## 🟡 Minor Issues

### 1. `src/lib/api.ts` L6 — `console.error` au lieu de `logger`

```ts
// ❌ Viole la règle "No Debug Logs" de global-rules.md
console.error('API error:', err)
```

Ce fichier est un handler serveur (`apiErrorResponse`). Il doit utiliser `logger.error` de `@/lib/logger`.

**Fix :**
```ts
import { logger } from '@/lib/logger'
// ...
logger.error('API error:', err)
```

### 2. `src/components/AppointmentScheduler.tsx` + `AppointmentModal.tsx` — `alert()` en production

**Fichiers :**
- `AppointmentScheduler.tsx` L195, L196, L200, L223, L227 — 5 appels `alert()`
- `calendar/AppointmentModal.tsx` L268, L283, L304, L312 — 4 appels `alert()`

`alert()` est un appel bloquant natif du navigateur, incompatible avec l'UX du projet (Sonner toasts). Le projet importe déjà `toast` de `sonner` dans CheckoutModal et d'autres composants.

**Fix :** Remplacer les `alert(msg)` par `toast.error(msg)`.

### 3. `src/services/analytics.service.ts` L6 — Cast `as` sans `// RAISON:`

```ts
// Manque commentaire RAISON
const obj = val as { toNumber?: () => number }
```

**Fix :** Ajouter `// RAISON: Prisma Decimal expose .toNumber() — cast nécessaire car val est unknown`.

### 4. Test E2E toujours skippé

`test/e2e/stats.dashboard.e2e.spec.ts` — inchangé depuis V4.

---

## 🧠 Global Recommendations

1. **Supprimer `src/types/next-server.d.ts`** si vide : un fichier `.d.ts` vide inclus dans `tsconfig` ajoute du bruit et peut créer des augmentations parasites si quelqu'un l'édite par erreur. Supprimer le fichier est plus propre que le laisser vide.

2. **Cache TypeScript (`tsconfig.tsbuildinfo`)** : Le cache stale a amplifié l'erreur en cascade (21 fausses erreurs `NextResponse not found`). Ajouter `tsconfig.tsbuildinfo` au `.gitignore` si pas déjà présent, et inclure `rm -f tsconfig.tsbuildinfo` dans le script `prebuild` de `package.json` pour éviter les faux positifs en CI.

3. **`src/app/api/users/route.ts`** : Envisager de faire migrer la création d'utilisateurs via `password.service.ts` (centralisé) plutôt que d'avoir la logique bcrypt inline dans la route.

4. **Tests unitaires** : Ajouter un test pour `createAppointmentAction` couvrant le cas `staffId: undefined` (bug résolu en V6 mais non couvert).

5. **E2E** : Activer un job GitHub Actions avec Postgres 16 pour couvrir les tests E2E.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Major TypeScript Regression 🟠
- **`src/proxy.ts`** : Remplacer `(req: NextRequest)` par `(req: NextAuthRequest)` importé de `'next-auth'`. Accéder à `req.auth` directement. Supprimer `src/types/next-server.d.ts`.

### Priorité 2 — Major DRY 🟠
- **`src/app/api/users/route.ts`** L40 : Importer `BCRYPT_ROUNDS` depuis `@/lib/crypto` et remplacer `10` par `BCRYPT_ROUNDS`.

### Priorité 3 — Minors 🟡
- **`src/lib/api.ts`** : Remplacer `console.error` par `logger.error` (import `@/lib/logger`).
- **`AppointmentScheduler.tsx`** + **`AppointmentModal.tsx`** : Remplacer tous les `alert()` par `toast.error()` (import `toast` de `sonner`).
- **`src/services/analytics.service.ts`** L6 : Ajouter `// RAISON:` sur le cast `as`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **68/100** (-16 vs V6).

0 IDOR, 0 `as any`, TypeScript 1 erreur résiduelle dans src/ (proxy.ts — régression autofixer-V6), 11/11 tests verts.
2 Majors bloquants : régression TS proxy.ts + bcrypt hardcoded users/route.ts.
4 Minors : api.ts console.error, alert() dans 2 composants, toNumber RAISON manquant, E2E skippé.

Lance `/autofixer` pour atteindre 90+/100.

