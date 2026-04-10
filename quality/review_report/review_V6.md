# 🧪 Next.js Code Review Report - V6

> **Date :** 2026-04-10
> **Scope :** Audit post-autofixer V5 — branche `feature/mobile-navigation`
> **Baseline :** V5 (score 75/100 — CHANGES REQUIRED)

---

## 🧾 Summary

- **Score:** 84/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 3
- **Progression vs V5 :** +9 pts

---

## ✅ Points résolus depuis V5

| Item V5 | Statut |
|---|---|
| 🟠 `RoleGuard.tsx` — `as unknown as Record<string,unknown>` | ✅ Supprimé — `session.user.role` direct |
| 🟡 `BCRYPT_ROUNDS` non centralisé | ✅ `src/lib/crypto.ts` créé + importé partout |
| 🟡 `reset-password` token `min(1)` | ✅ `.length(64)` |
| 🟡 `console.warn` dans Server Action | ✅ `logger.warn` |
| 🟡 Cast `as string` sans `// RAISON:` | ✅ Commenté |
| TypeScript (`tsc --noEmit`) | ✅ 0 erreur |
| Tests (Vitest) | ✅ 11/11 (1 E2E skippé) |
| `as any` dans tout le code source | ✅ 0 |
| `as PrismaClient` dans tout le code source | ✅ 0 |
| `console.*` hors lib | ✅ 0 |

---

## 🔴 Critical Issues (Blocking)

_Aucune. Zéro IDOR confirmé sur toutes les routes._

---

## 🟠 Major Issues

### [LOGIC BUG] `createAppointmentAction` — Conflict check avec `staffId: undefined`

**Fichier :** `src/app/agenda/actions/appointments.ts` L36-49

**Problem :** `staffId` est optionnel dans `CreateAppointmentSchema`. Quand il est `undefined`, Prisma **ignore silencieusement** le filtre `staffId: undefined` dans le `where`, transformant le conflit check en une recherche sur **TOUS les rendez-vous de l'organisation** — pas seulement ceux du staff.

```ts
// ❌ Actuel — conflict check AVANT que staffId soit résolu
const conflict = await prisma.appointment.findFirst({
  where: {
    staffId,          // ← undefined si non fourni → Prisma ignore ce filtre
    organizationId: orgId,
    AND: [...]
  }
})
// Note : le fallback staffId n'est résolu QUE APRÈS ce check (ligne 52-56)
```

**Impact :**
- Si `staffId` est `undefined` et qu'il existe **un seul** rendez-vous dans la plage horaire (même pour un autre staff), la création échouera avec une fausse erreur `"Ce membre du personnel est déjà occupé"`.
- Inversement, si `staffId` est `undefined` et qu'il n'y a pas de conflit global, la création réussit sans vérifier le conflit réel du staff fallback.

**Fix :** Déplacer le conflict check **après** la résolution du `assignedStaffId` :

```ts
// ✅ Fix — résoudre le staffId AVANT le conflict check
let assignedStaffId = staffId
if (!assignedStaffId) {
  const fallback = await prisma.staff.findFirst({ where: { organizationId: orgId } })
  assignedStaffId = fallback?.id
}
if (!assignedStaffId) return { error: 'No staff available to assign' }

// Conflict check avec le staffId réel (jamais undefined)
const conflict = await prisma.appointment.findFirst({
  where: {
    staffId: assignedStaffId,
    organizationId: orgId,
    AND: [
      { startTime: { lt: endDate } },
      { endTime: { gt: startDate } },
    ],
  }
})
if (conflict) {
  return { error: "Ce membre du personnel est déjà occupé sur ce créneau." }
}
```

---

## 🟡 Minor Issues

### 1. Casts `as` sans commentaire `// RAISON:` dans 3 fichiers

**Fichiers :**

- **`src/components/dashboard/CheckoutModal.tsx` L112 + L123** — `(a as CheckoutAppointment).Note` et `(a as CheckoutAppointment).paymentMethod`. Ces casts font suite à un guard `'Note' in a` / `'paymentMethod' in a`, ce qui est correct, mais manquent du commentaire `// RAISON: propriété legacy Prisma CheckoutAppointment`.

- **`src/components/AppointmentScheduler.tsx` L165 + L168** — `info.event.extendedProps as Record<string, unknown>`. FullCalendar type `extendedProps` comme `Record<string, unknown>` — le cast est identique, mais doit être documenté : `// RAISON: FullCalendar extendedProps est nativement Record<string, unknown>`.

- **`src/auth.ts` L15 + L18** — `credentials.email as string` et `credentials.password as string`. NextAuth v5 type `credentials` en `Partial<Record<string, unknown>>`, d'où le cast obligatoire. À documenter : `// RAISON: next-auth v5 type credentials comme Partial<Record<string, unknown>> — champs garantis par config authorize`.

### 2. `src/proxy.ts` — Commentaire `// RAISON:` présent mais `as unknown as Record<string, unknown>` peut être remplacé par un type plus précis

`req as unknown as Record<string, unknown>` pour accéder à `req.auth`. NextAuth v5 expose `NextRequestWithAuth` dans `next-auth/middleware`. Utiliser ce type éviterait le double cast.

```ts
// Actuel
const maybeReq = req as unknown as Record<string, unknown>
const authClaim = maybeReq['auth'] ?? null

// ✅ Alternative plus propre (si NextRequestWithAuth est dispo)
import type { NextRequestWithAuth } from 'next-auth/middleware'
const authClaim = (req as NextRequestWithAuth).auth ?? null
```

### 3. Test E2E toujours skippé

`test/e2e/stats.dashboard.e2e.spec.ts` — inchangé.

---

## 🧠 Global Recommendations

1. **`createAppointmentAction` atomicité** : Considérer une transaction Prisma pour la vérification de conflit + création du rendez-vous afin d'éviter les race conditions (deux créations simultanées au même créneau).

2. **Tests unitaires pour `createAppointmentAction`** : Le bug du conflict check `staffId: undefined` n'est couvert par aucun test existant. Ajouter un test :
   ```ts
   it('should not return conflict when staffId is undefined', async () => { ... })
   ```

3. **`src/schemas/auth.ts`** (recommandation V4 toujours ouverte) : Centraliser `ResetPasswordSchema` + schema token depuis `forgot-password` dans un fichier dédié.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — Logic Bug 🟠
- **`src/app/agenda/actions/appointments.ts`** : Déplacer la résolution du `assignedStaffId` (lignes 52-56) **avant** le conflict check (lignes 36-49). Mettre à jour le `where.staffId` avec `assignedStaffId` (garanti non-undefined).

### Priorité 2 — Clean Code 🟡
- **`src/components/dashboard/CheckoutModal.tsx`** : Ajouter `// RAISON: propriété legacy Prisma CheckoutAppointment` sur L112 et L123.
- **`src/components/AppointmentScheduler.tsx`** : Ajouter `// RAISON: FullCalendar extendedProps est nativement Record<string, unknown>` sur L165 et L168.
- **`src/auth.ts`** : Ajouter `// RAISON: next-auth v5 type credentials comme Partial<Record<string, unknown>>` sur L15 et L18.
- **`src/proxy.ts`** : Envisager `NextRequestWithAuth` à la place du double cast (optionnel — RAISON déjà documentée).

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **84/100** (+9 vs V5).

0 IDOR, 0 `as any`, 0 `as PrismaClient`, 0 `console.*` hors lib, TypeScript propre, 11/11 tests.
1 Major : bug logique dans `createAppointmentAction` — conflict check avec `staffId` potentiellement `undefined` provoque des faux positifs/négatifs de conflit horaire.
3 Minors : casts sans `// RAISON:` dans CheckoutModal/AppointmentScheduler/auth.ts, proxy potentiellement améliorable, E2E skippé.

Lance `/autofixer` pour atteindre 100/100.

