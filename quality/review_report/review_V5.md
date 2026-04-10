# 🧪 Next.js Code Review Report - V5

> **Date :** 2026-04-10
> **Scope :** Audit post-annulation autofixer V4 — branche `feature/mobile-navigation`
> **Baseline :** V4 (score 75/100 — CHANGES REQUIRED)
> **Contexte :** `/nautofixer` a été appelé après V4 → les correctifs V4 n'ont pas été appliqués. V5 confirme l'état actuel et liste les items toujours ouverts.

---

## 🧾 Summary

- **Score:** 75/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 5
- **Δ vs V4 :** 0 pt (aucun fix appliqué depuis V4)

---

## ✅ Points toujours valides

| Item | Statut |
|---|---|
| 0 IDOR dans toutes les routes API | ✅ |
| 0 `as any` dans tout le code source | ✅ confirmé |
| 0 `as PrismaClient` | ✅ confirmé |
| Zod sur tous les endpoints POST/PUT/PATCH | ✅ (sauf token trop permissif — voir Minor #1) |
| bcrypt rounds = 12 partout | ✅ (valeur correcte, non centralisée — voir Minor #4) |
| IDOR `customers/[id]/packages` GET | ✅ corrigé en V3 |
| `clientLogger` dans prod code (clients page, hooks) | ✅ |
| TypeScript `tsc --noEmit` | ✅ 0 erreur |
| Tests Vitest | ✅ 11/11 (1 E2E skippé) |

---

## 🔴 Critical Issues (Blocking)

_Aucune._

---

## 🟠 Major Issues (Open depuis V4)

### [TYPES] `RoleGuard.tsx` — Doubles casts `as unknown as Record<string, unknown>` inutiles

**Fichier :** `src/components/RoleGuard.tsx` L15 + L22

**Violation :** `skills/global-rules.md` — *"Interdiction du `unknown` sauf capture d'erreurs. Type Casting `as` uniquement en dernier recours + commentaire `// RAISON:`."*

**Contexte :** Le type `session.user.role` est déjà `string | null` via `next-auth.d.ts` (augmentation de module confirmée dans le projet). Les casts sont donc non nécessaires **et** non documentés.

```ts
// ❌ Actuel
const user = session.user as unknown as Record<string, unknown>
const userRole = typeof (user.role as unknown) === 'string' ? (user.role as string) : undefined

// ❌ useIsAdmin
const user = session?.user as unknown as Record<string, unknown> | undefined
return (user && typeof (user.role as unknown) === 'string' && (user.role as string) === 'ADMIN')
```

**Fix :**
```ts
// ✅ Type augmenté — aucun cast nécessaire
export default function RoleGuard({ role, children }: RoleGuardProps) {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (!session?.user) return null
  return session.user.role === role ? <>{children}</> : null
}

export function useIsAdmin() {
  const { data: session } = useSession()
  return session?.user?.role === 'ADMIN'
}
```

---

## 🟡 Minor Issues (Open depuis V4)

### 1. `reset-password/route.ts` L10 — Validation Zod token trop permissive
```ts
// ❌ Actuel
token: z.string().min(1)

// ✅ Fix — token = 64 hex chars (randomBytes(32).toString('hex'))
token: z.string().length(64)
```

### 2. `agenda/actions/appointments.ts` L75 — `console.warn` dans une Server Action
```ts
// ❌ Actuel
console.warn('revalidatePath failed', e)

// ✅ Fix
import { logger } from '@/lib/logger'
// ...
logger.warn('revalidatePath failed', e)
```

### 3. `agenda/actions/appointments.ts` L24 — Cast `as string` non documenté
```ts
// ❌ Actuel
const orgId = session.user.organizationId as string

// ✅ Fix
const orgId = session.user.organizationId as string // RAISON: narrowing garanti par la vérification !organizationId ligne 21
```

### 4. `BCRYPT_ROUNDS` non centralisé
`reset-password/route.ts` définit `const BCRYPT_ROUNDS = 12` localement. `password.service.ts` hardcode `12` à la ligne 31. Toute dérive future (ex: upgrade vers 14 rounds) devra être modifiée à deux endroits.

**Fix :** Créer `src/lib/crypto.ts` :
```ts
/** Nombre de rounds bcrypt — référence unique pour tout le projet */
export const BCRYPT_ROUNDS = 12
```
Importer dans `reset-password/route.ts` et `password.service.ts`.

### 5. Test E2E skippé
`test/e2e/stats.dashboard.e2e.spec.ts` reste skippé (provider `postgresql` vs SQLite local). Aucune régression de non-régression sur les stats.

---

## 🧠 Global Recommendations (inchangées)

1. **`src/schemas/auth.ts`** : Centraliser les schémas Zod liés à l'auth (`ResetPasswordSchema`, token de forgot-password) dans un fichier dédié pour éviter la duplication.
2. **CI E2E** : Job GitHub Actions avec `services: postgres:16` pour réactiver le test skippé.
3. **`src/lib/crypto.ts`** : Constante `BCRYPT_ROUNDS` + potentiellement un helper `hashPassword(plain)` / `comparePassword(plain, hash)` pour encapsuler bcrypt.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Types 🟠
- **`src/components/RoleGuard.tsx`** : Remplacer les 2 blocs `as unknown as Record<string, unknown>` par accès direct à `session.user.role`.

### Priorité 2 — Clean Code 🟡
1. **`src/lib/crypto.ts`** (NOUVEAU) : `export const BCRYPT_ROUNDS = 12`.
2. **`src/app/api/auth/reset-password/route.ts`** : Importer `BCRYPT_ROUNDS`, renforcer `token: z.string().length(64)`, supprimer la constante locale.
3. **`src/services/password.service.ts`** : Remplacer le hardcode `12` par `BCRYPT_ROUNDS`.
4. **`src/app/agenda/actions/appointments.ts`** : `console.warn` → `logger.warn`, ajouter `// RAISON:` sur le cast L24.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **75/100** (stable vs V4).

L'état du code est sain : 0 IDOR, 0 `as any`, 0 `as PrismaClient`, TypeScript propre, 11/11 tests.
1 Major à corriger : `RoleGuard.tsx` bypass le système de types avec des casts redondants alors que `session.user.role` est déjà typé dans `next-auth.d.ts`.
4 Minors de Clean Code : token Zod trop permissif, `console.warn` non loggé, cast non documenté, `BCRYPT_ROUNDS` non centralisé.

Lance `/autofixer` pour atteindre 100/100.

