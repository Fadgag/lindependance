# 🧪 Next.js Code Review Report - V2

> **Date :** 2026-04-10
> **Scope :** Codebase post-autofixer V1 — feature `mobile-navigation` + API routes + services + tests
> **Baseline :** V1 (score 68/100)

---

## 🧾 Summary

- **Score:** 88/100
- **Verdict:** ⚠️ CHANGES REQUIRED (minor)
- **Stats:** Critical: 0 | Major: 2 | Minor: 5
- **Progression vs V1 :** +20 pts

---

## ✅ Points résolus depuis V1

| Item V1 | Statut |
|---|---|
| `menuItems.ts` — `as any` x5 | ✅ Corrigé — `LucideProps` utilisé |
| `checkout/route.ts` — `console.error` | ✅ Corrigé — `apiErrorResponse` |
| `forgot-password/route.ts` — `console.error` + `prisma as PrismaClient` | ✅ Corrigé |
| `users/route.ts` — `prisma as PrismaClient` | ✅ Corrigé |
| `appointments/route.ts` PUT — body sans Zod | ✅ Corrigé — `UpdateAppointmentSchema.safeParse` |
| `MobileSheet.tsx` — commentaire manquant sur `onClose` | ✅ Ajouté |
| `MobileNav.tsx` — import React manquant | ✅ Corrigé |
| `Sidebar.tsx` — classe Tailwind dupliquée | ✅ Corrigé |
| `MobileHeader.tsx` — double classe background | ✅ Corrigé |
| TypeScript clean (tsc --noEmit) | ✅ 0 erreur |
| Tests unitaires (Vitest) | ✅ 11/11 passent (1 E2E skippé justifié) |

---

## 🔴 Critical Issues (Blocking)

_Aucune — zéro IDOR, tous les endpoints API filtrent par `organizationId`._

---

## 🟠 Major Issues

### [ZOD MANQUANT] `forgot-password/route.ts` — Corps non validé via Zod

**Problem :** La requête POST accepte `email` via `req.json()` sans validation Zod préalable. Une entrée malformée peut provoquer une erreur non anticipée :

```ts
// ❌ Actuel
const { email } = await req.json()
if (!email) return ...
```

**Impact :** Pas d'IDOR, mais une payload `{ email: 12345 }` (nombre au lieu de string) passerait la garde `!email` et atteindrait `prisma.user.findUnique({ where: { email: 12345 } })` — risque d'erreur Prisma non catchée proprement.

**Fix :**
```ts
// ✅
import { z } from 'zod'
const ForgotPasswordSchema = z.object({ email: z.string().email() })
const parsed = ForgotPasswordSchema.safeParse(await req.json())
if (!parsed.success) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
const { email } = parsed.data
```

---

### [TYPES] `CheckoutModal.tsx` — 5 occurrences de `as any` résiduelles

**Problem :** Après le refactoring, il reste 5 usages de `as any` dans le composant (lignes 106, 111, 111, 116, 119, 124). Les helpers `extractExtras`, `extractNote`, `extractPaymentMethod` acceptent `CheckoutAppointment | AppointmentSummary` mais les appels finaux passent `appointment as any` et les vérifications internes utilisent `(a as any).Note` et `(a as any).paymentMethod` au lieu d'exploiter l'union de types existante.

**Fix :** Supprimer `as any` en exploitant l'union de types existante :
```ts
// Les deux types ont 'Note?: string' dans CheckoutAppointment — utiliser in-guard propre
const extractNote = (a: CheckoutAppointment | AppointmentSummary): string => {
    if ('note' in a && typeof a.note === 'string') return a.note
    // Note (uppercase) est déclaré dans CheckoutAppointment — cast légitime documenté
    // RAISON: Note (uppercase) est une propriété Prisma legacy de CheckoutAppointment
    if ('Note' in a) {
        const val = (a as CheckoutAppointment).Note
        if (typeof val === 'string') return val
    }
    return typeof a.extendedProps?.note === 'string' ? a.extendedProps.note : ''
}
// appel : setNote(extractNote(appointment)) — plus besoin de "as any"
```

---

## 🟡 Minor Issues

- **`checkout/route.ts` POST L18 :** Le corps de la requête (`totalPrice`, `extras`, `note`, `paymentMethod`) n'est pas validé via Zod. Le handler POST encaissement accède directement à `req.json()` sans schéma. Risque de stockage de données malformées (extras JSON non contrôlé).
- **`users/route.ts` L17+L31 :** Indentation incorrecte de `const session = await auth()` (décalée par rapport au bloc `try`). Purement cosmétique mais viole les conventions du projet.
- **`MobileNav.tsx` L18 :** Cast `session?.user as Record<string, unknown> | undefined` — le type `user` de next-auth v5 étend déjà les propriétés custom via `next-auth.d.ts`. Utiliser le type augmenté plutôt qu'un cast.
- **`MobileSheet.tsx` + `MobileNav.tsx` :** Lignes vides superflues en fin de fichier (3 et 2 lignes respectivement). Clean Code.
- **`menuItems.ts` :** 5 lignes vides en fin de fichier. Clean Code.

---

## 🧠 Global Recommendations

1. **Zod systématique sur tous les POST body** : 3 handlers POST n'utilisent pas Zod (`forgot-password`, `checkout/POST`, `packages`). Standardiser avec un helper `parseBody<T>(req, schema)`.
2. **E2E Prisma** : Le test E2E `stats.dashboard.e2e.spec.ts` est actuellement skipé car Prisma schema est configuré pour PostgreSQL. Pour le réactiver proprement, envisager un fichier `schema.test.prisma` avec provider `sqlite` ou un environnement CI avec Postgres.
3. **Tests mobile manquants** : `MobileHeader` et `MobileSheet` n'ont toujours pas de tests unitaires dédiés. À ajouter pour protéger la feature mobile navigation.
4. **DRY — `session?.user as Record<string, unknown>`** : Ce pattern est utilisé à 2 endroits (`Sidebar.tsx` et `MobileNav.tsx`). Créer un helper typed `getUserRole(session)` dans `@/lib/auth-helpers.ts`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Zod :**
   - `forgot-password/route.ts` : Ajouter `ForgotPasswordSchema.safeParse`.
   - `checkout/route.ts POST` : Valider le body (`totalPrice`, `paymentMethod`, `note`, `extras`) via Zod.

2. **Priorité 2 — Types :**
   - `CheckoutModal.tsx` : Supprimer les 5 `as any` résiduels en remplaçant l'appel `appointment as any` par `appointment` (typé correctement).

3. **Priorité 3 — Clean Code :**
   - `users/route.ts` : Corriger l'indentation.
   - `MobileNav.tsx` : Utiliser le type augmenté next-auth, supprimer le cast `as Record<string, unknown>`.
   - Nettoyer lignes vides superflues dans `MobileSheet.tsx`, `MobileNav.tsx`, `menuItems.ts`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score 88/100. La feature `mobile-navigation` est fonctionnelle et sécurisée. Les 2 points Major restants sont une validation Zod manquante sur `forgot-password` (risque de crash Prisma sur entrée malformée) et 5 `as any` résiduels dans `CheckoutModal`. Aucune faille IDOR. Tests unitaires au vert (11/11). TypeScript propre (0 erreur tsc).

Lance `/autofixer` pour atteindre 100/100.

