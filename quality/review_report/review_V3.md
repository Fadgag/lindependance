# 🧪 Next.js Code Review Report - V3

> **Date :** 2026-04-10
> **Scope :** Audit complet — codebase branch `feature/mobile-navigation` (post-autofixer V2)
> **Baseline :** V2 (score 88/100, périmètre partiel)
> **Périmètre V3 :** Tous les routes API + services + composants + auth + types + tests

---

## 🧾 Summary

- **Score:** 47/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 1 | Major: 3 | Minor: 6
- **Note :** V2 avait un scope restreint (feature mobile-nav). V3 est le premier audit **complet** du codebase — la baisse de score reflète des issues existantes hors périmètre V2 et non une régression.

---

## ✅ Points validés (hérités de V2)

| Item | Statut |
|---|---|
| `menuItems.ts` — `as any` x5 | ✅ Corrigé |
| `checkout/route.ts` — Zod POST body | ✅ Présent |
| `forgot-password/route.ts` — Zod + logger | ✅ Corrigé |
| `users/route.ts` — Zod + prisma direct | ✅ Corrigé |
| `appointments/route.ts` PUT/POST/DELETE — Zod + IDOR | ✅ Clean |
| `MobileHeader/Sheet/Nav` — a11y + data-testid | ✅ Présents |
| TypeScript (`tsc --noEmit`) | ✅ 0 erreur |
| Tests unitaires (Vitest) | ✅ 11/11 (1 E2E skippé) |
| `updatePasswordAction` — Zod + bcrypt | ✅ Clean |
| `dashboard.service.ts` — PAID vs projected CA | ✅ Corrigé |

---

## 🔴 Critical Issues (Blocking)

### [IDOR] `GET /api/customers/[id]/packages` — Absence de vérification organizationId sur customerPackage

**Fichier :** `src/app/api/customers/[id]/packages/route.ts` L8-51

**Violation :** Global Rules — *"Aucune donnée ne doit être lue ou écrite sans vérifier l'appartenance à `session.organizationId`."*

**Impact :** Un utilisateur authentifié de l'Organisation A peut faire :
```
GET /api/customers/{id_client_org_B}/packages
```
Le handler extrait `customerId` de l'URL (regex), vérifie uniquement que `orgId` existe (l'utilisateur est authentifié), puis interroge `prisma.customerPackage.findMany({ where: { customerId } })` **sans jamais vérifier que ce client appartient à l'organisation du requêteur**. Résultat : fuite de données inter-organisations (séances restantes, packages, dates d'expiration).

```ts
// ❌ IDOR actuel
const packs = await prisma.customerPackage.findMany({
    where: {
        customerId,  // ← id provenant de l'URL, non validé contre orgId
        sessionsRemaining: { gt: 0 },
        ...
    },
```

**Fix requis :**
```ts
// ✅ Fix Anti-IDOR
// 1. Vérifier que le customer appartient à l'organisation AVANT la query customerPackage
const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId }
})
if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

// 2. Ensuite seulement : récupérer les packages
const packs = await prisma.customerPackage.findMany({
    where: {
        customerId,
        customer: { organizationId: orgId }, // double guard
        sessionsRemaining: { gt: 0 },
        ...
    },
```

---

## 🟠 Major Issues

### [ZOD] `reset-password/route.ts` — Corps non validé via Zod

**Fichier :** `src/app/api/auth/reset-password/route.ts` L10-11

**Problem :**
```ts
// ❌ Actuel — pas de Zod
const { token, password } = await req.json()
if (!token || !password) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
```
- `token` peut être un objet, un array ou un nombre — `!token` ne le détecte pas.
- `password` n'est pas validé en longueur/format → un mot de passe vide (`" "`) passe la garde.
- De plus, `bcrypt.hash(password, 10)` utilise **10 rounds** alors que `password.service.ts` utilise **12** — incohérence de sécurité.

**Fix :**
```ts
const ResetPasswordSchema = z.object({
  token: z.string().min(64).max(64),
  password: z.string().min(8)
})
const parsed = ResetPasswordSchema.safeParse(await req.json())
if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
const { token, password } = parsed.data
// ...
const hashed = await bcrypt.hash(password, 12)  // cohérence avec password.service.ts
```

---

### [TYPES] `prisma as PrismaClient` dans 3 fichiers sans commentaire RAISON

**Fichiers concernés :**
- `src/app/api/auth/reset-password/route.ts` L6
- `src/app/api/packages/route.ts` L5-6
- `src/app/api/staff/route.ts` L4-6

**Problem :** Le pattern `const db = prisma as PrismaClient` avec import de `PrismaClient` est un contournement de l'inférence de types Prisma. C'est documenté comme workaround dans `packages/route.ts` mais sans commentaire `// RAISON:` conforme aux Global Rules. Pour `staff` et `reset-password`, aucune justification.

**Fix :** Remplacer par `prisma` direct (le type est déjà correct depuis `@/lib/prisma`) ou documenter avec `// RAISON: TS18046 workaround — Prisma types perdus entre modules dans cette config TS`.

---

### [DRY] `analytics.service.ts` — Logique de conversion Decimal dupliquée

**Fichier :** `src/services/analytics.service.ts` L18-23 et L65-70

**Problem :** Le bloc de conversion Decimal → number est copié-collé à l'identique en deux endroits dans le même fichier :
```ts
// ❌ Dupliqué (lignes 18-23 ET 65-70)
const pobj = price as unknown as { toNumber?: () => number }
if (pobj && typeof pobj.toNumber === 'function') {
  try { n = pobj.toNumber() } catch { n = Number(price ?? 0) }
} else {
  n = Number(price ?? 0)
}
```

**Fix :**
```ts
// ✅ Extraire un helper
function toNumber(val: unknown): number {
  const obj = val as { toNumber?: () => number }
  if (obj && typeof obj.toNumber === 'function') {
    try { return obj.toNumber() } catch { /* fallthrough */ }
  }
  return Number(val ?? 0)
}
```

---

## 🟡 Minor Issues

1. **`src/app/customers/[id]/page.tsx` L34** — `console.error` directement au lieu de `logger.error`. Viole la règle "Pas de Logs de Debug" hors `@/lib/logger`.

2. **`src/hooks/useAppointments.ts` L22** — `console.error(err)` non passé via `clientLogger` — incohérent avec le pattern établi dans `src/lib/clientLogger.ts`.

3. **`src/app/api/organization/settings/route.ts` L20 + L38** — `String(err)` au lieu de `apiErrorResponse(err)`. Expose le message d'erreur brut au client et ne suit pas le pattern centralisé.

4. **`src/components/layout/Sidebar.tsx` L41** — Cast `session?.user as Record<string, unknown> | undefined` pour accéder à `.role`. Le type session est augmenté via `next-auth.d.ts` et expose déjà `session.user.role`. Utiliser `session?.user?.role !== 'ADMIN'` directement.

5. **`src/components/layout/menuItems.ts` L13-14** — Deux entrées utilisent le même icône `CalendarDays` (`Accueil` et `Agenda`). `Accueil` devrait utiliser `Home` (lucide-react) pour différencier visuellement les routes.

6. **`test/e2e/stats.dashboard.e2e.spec.ts`** — Test E2E toujours skippé (provider Prisma postgresql vs sqlite local). Bloquer les PRs en CI sans ce test réduit la couverture de non-régression sur les stats critiques.

---

## 🧠 Global Recommendations

1. **Anti-IDOR systématique sur les routes imbriquées** : Toutes les routes `[id]/sub-resource` doivent vérifier que la ressource parente (ici `Customer`) appartient à l'organisation AVANT d'interroger la sous-ressource. Pattern à documenter dans `skills/global-rules.md`.

2. **Standardiser les bcrypt rounds** : Toujours 12 rounds dans toute la codebase. Créer une constante partagée dans `@/lib/crypto.ts` : `export const BCRYPT_ROUNDS = 12`.

3. **Helper `parseBody<T>`** : Créer un helper centralisé `src/lib/parseBody.ts` pour éviter la répétition de `z.parse(await req.json())` dans chaque route — déjà recommandé en V2.

4. **E2E CI** : Configurer GitHub Actions avec une base Postgres (via `services: postgres`) pour réactiver le test E2E `stats.dashboard.e2e.spec.ts` en CI.

5. **Audit des routes `/app/(dashboard)`** : Les Server Actions (`settings/account/actions.ts`) sont correctement sécurisées. Auditer les autres server actions si elles existent.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Sécurité IDOR 🔴
- **`src/app/api/customers/[id]/packages/route.ts`** : Ajouter guard `findFirst({ where: { id: customerId, organizationId: orgId } })` avant la query customerPackage dans le GET. Ajouter aussi `customer: { organizationId: orgId }` dans le `where` du `findMany`.

### Priorité 2 — Zod + Types 🟠
- **`src/app/api/auth/reset-password/route.ts`** :
  - Remplacer validation manuelle par `ResetPasswordSchema.safeParse`.
  - Passer bcrypt rounds de 10 à 12.
  - Supprimer `prisma as PrismaClient` → utiliser `prisma` directement.
- **`src/app/api/packages/route.ts`** : Supprimer `prisma as PrismaClient` → `prisma` direct + commentaire RAISON si nécessaire.
- **`src/app/api/staff/route.ts`** : Idem.

### Priorité 3 — DRY + Clean Code 🟡
- **`src/services/analytics.service.ts`** : Extraire helper `toNumber(val)`.
- **`src/app/api/organization/settings/route.ts`** : Remplacer `String(err)` par `apiErrorResponse(err)`.
- **`src/components/layout/Sidebar.tsx`** : Utiliser `session?.user?.role` directement.
- **`src/components/layout/menuItems.ts`** : Remplacer `CalendarDays` par `Home` pour l'entrée `Accueil`.
- **`src/app/customers/[id]/page.tsx`** + **`src/hooks/useAppointments.ts`** : Remplacer `console.error` par `logger.error` / `clientLogger`.

---

## 🧮 Final Decision

**❌ BLOCK** — Score 47/100.

1 faille IDOR critique dans `GET /api/customers/[id]/packages` (fuite de données inter-organisations).
3 issues majeures : Zod manquant sur reset-password, `as PrismaClient` non documenté x3, DRY violation.
TypeScript propre (0 erreur), tests unitaires au vert (11/11).

Lance `/autofixer` pour atteindre 100/100.

