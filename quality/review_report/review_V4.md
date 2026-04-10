# 🧪 Next.js Code Review Report - V4

> **Date :** 2026-04-10
> **Scope :** Audit post-autofixer V3 — codebase complet, branche `feature/mobile-navigation`
> **Baseline :** V3 (score 47/100 — BLOCK)

---

## 🧾 Summary

- **Score:** 75/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 5
- **Progression vs V3 :** +28 pts

---

## ✅ Points résolus depuis V3

| Item V3 | Statut |
|---|---|
| 🔴 IDOR `customers/[id]/packages` GET | ✅ Corrigé — double guard `customer.findFirst + customer: { organizationId }` |
| 🟠 Zod manquant `reset-password/route.ts` | ✅ `ResetPasswordSchema.safeParse` ajouté |
| 🟠 bcrypt rounds 10 → 12 | ✅ Corrigé — constante `BCRYPT_ROUNDS = 12` |
| 🟠 `prisma as PrismaClient` x3 | ✅ Supprimés — `prisma` direct partout |
| 🟠 DRY `analytics.service.ts` | ✅ Helper `toNumber(val)` extrait |
| 🟡 `String(err)` → `apiErrorResponse` | ✅ `organization/settings/route.ts` corrigé |
| 🟡 Sidebar `as Record<string,unknown>` | ✅ → `session?.user?.role` direct |
| 🟡 `menuItems.ts` icône dupliquée | ✅ `Home` pour Accueil, `CalendarDays` pour Agenda |
| 🟡 `console.error` prod code | ✅ → `clientLogger` dans `customers/[id]/page.tsx` + `useAppointments.ts` |
| TypeScript (`tsc --noEmit`) | ✅ 0 erreur |
| Tests (Vitest) | ✅ 11/11 (1 E2E skippé) |
| 0 `as any` dans tout le code source | ✅ Confirmé |
| 0 `as PrismaClient` dans tout le code source | ✅ Confirmé |

---

## 🔴 Critical Issues (Blocking)

_Aucune — zéro IDOR détecté. Tous les endpoints API scopernt correctement par `organizationId`._

---

## 🟠 Major Issues

### [TYPES] `RoleGuard.tsx` — Doubles casts `as unknown as Record<string, unknown>` inutiles

**Fichier :** `src/components/RoleGuard.tsx` L15, L22

**Violation :** Global Rules — *"Interdiction du `unknown` : doit être réduit immédiatement via un type guard. Type Casting `as` : uniquement en dernier recours avec commentaire `// RAISON:`."*

**Problem :** Le type `session.user.role` est déjà déclaré `string | null` via l'augmentation de module `next-auth.d.ts` :
```ts
// next-auth.d.ts (déjà présent dans le projet)
interface Session extends DefaultSession {
  user: DefaultSession['user'] & {
    id: string
    organizationId?: string | null
    role?: string | null   // ← DÉJÀ TYPÉ
  }
}
```

Pourtant `RoleGuard.tsx` contourne ce type avec :
```ts
// ❌ Actuel — bypass complet du système de types
const user = session.user as unknown as Record<string, unknown>
const userRole = typeof (user.role as unknown) === 'string' ? (user.role as string) : undefined
```

Et `useIsAdmin` :
```ts
// ❌ Actuel
const user = session?.user as unknown as Record<string, unknown> | undefined
return (user && typeof (user.role as unknown) === 'string' && (user.role as string) === 'ADMIN')
```

**Fix :**
```ts
// ✅ Utiliser le type augmenté directement
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

## 🟡 Minor Issues

1. **`src/app/api/auth/reset-password/route.ts` L10** — `token: z.string().min(1)` trop permissif. Le token est généré par `crypto.randomBytes(32).toString('hex')` → exactement **64 caractères hex**. La validation Zod devrait imposer `.min(64).max(64)` pour rejeter dès la couche HTTP les tokens manifestement invalides.

2. **`src/app/agenda/actions/appointments.ts` L75** — `console.warn('revalidatePath failed', e)` dans une Server Action. Doit être remplacé par `logger.warn` de `@/lib/logger` (disponible côté serveur).

3. **`src/app/agenda/actions/appointments.ts` L24** — `const orgId = session.user.organizationId as string` — cast `as string` sans commentaire `// RAISON:`. La vérification `!session.user?.organizationId` à la ligne 21 garantit la valeur non-null, mais TypeScript ne la narrowe pas jusqu'à `string`. À documenter : `// RAISON: narrowing garanti par la vérification ligne 21`.

4. **`src/app/api/auth/reset-password/route.ts` L7** — `const BCRYPT_ROUNDS = 12` défini localement. La même valeur est utilisée hardcodée dans `password.service.ts` (ligne 31). Créer une constante partagée dans `@/lib/crypto.ts` pour éviter une dérive future.

5. **`test/e2e/stats.dashboard.e2e.spec.ts`** — Test E2E toujours skippé (provider `postgresql` vs SQLite local). Recommandation : ajouter un job CI GitHub Actions avec un service Postgres (`services: postgres:`) pour réactiver ce test en intégration continue.

---

## 🧠 Global Recommendations

1. **Constante partagée BCRYPT_ROUNDS** : Créer `src/lib/crypto.ts` :
   ```ts
   export const BCRYPT_ROUNDS = 12
   ```
   Importer depuis `reset-password/route.ts` et `password.service.ts`.

2. **`RoleGuard` et `useIsAdmin`** : Après le fix, supprimer le `"as unknown as Record<string, unknown>"` pattern définitivement — le type augmenté est correctement configuré et ne devrait jamais nécessiter ce niveau de casting.

3. **CI E2E** : Configurer `.github/workflows/ci.yml` avec :
   ```yaml
   services:
     postgres:
       image: postgres:16
       env:
         POSTGRES_PASSWORD: test
       options: --health-cmd pg_isready
   ```

4. **Centraliser les Zod token schemas** : Le schema `ResetPasswordSchema` et le schema inline dans `forgot-password` pourraient partager un `z.string().min(64).max(64)` via `src/schemas/auth.ts`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Types 🟠
- **`src/components/RoleGuard.tsx`** : Supprimer les `as unknown as Record<string, unknown>`, utiliser `session.user.role` directement (type déjà déclaré dans `next-auth.d.ts`).

### Priorité 2 — Clean Code 🟡
- **`src/app/api/auth/reset-password/route.ts`** : Renforcer `token: z.string().min(64).max(64)`.
- **`src/app/agenda/actions/appointments.ts`** : `console.warn` → `logger.warn` + ajouter commentaire `// RAISON:` sur le cast `as string`.
- **`src/lib/crypto.ts`** : Créer le fichier avec `export const BCRYPT_ROUNDS = 12`, l'importer dans `reset-password` et `password.service.ts`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score 75/100.

0 IDOR, 0 `as any`, 0 `as PrismaClient`. TypeScript clean, tests au vert.
1 Major : `RoleGuard.tsx` bypasse le système de types avec `as unknown as Record<string,unknown>` alors que `session.user.role` est déjà typé via `next-auth.d.ts`.
5 Minors : token Zod trop permissif, `console.warn` non loggé, cast non documenté, BCRYPT_ROUNDS non centralisé, E2E skippé.

Lance `/autofixer` pour atteindre 100/100.

