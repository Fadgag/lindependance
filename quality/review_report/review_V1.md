# 🧪 Next.js Code Review Report - V1

> **Date :** 2026-04-10
> **Scope :** Feature `mobile-navigation` + codebase API routes + services

---

## 🧾 Summary

- **Score:** 68/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 8 | Minor: 5

---

## 🔴 Critical Issues (Blocking)

_Aucune faille IDOR critique détectée. Toutes les routes API vérifient `organizationId`._

---

## 🟠 Major Issues

### [TYPES] `menuItems.ts` — `any` interdit (x5)

**Problem :** Les 5 entrées du tableau `menuItems` castent l'icône en `as any`, et le type `icon: React.ComponentType<any>` viole la règle "0% `any`".

```ts
// ❌ Actuel
icon: React.ComponentType<any>
{ name: 'Accueil', icon: CalendarDays as any, ... }

// ✅ Fix attendu
import type { LucideProps } from 'lucide-react'
icon: React.ComponentType<LucideProps>
{ name: 'Accueil', icon: CalendarDays, ... }  // pas de cast nécessaire
```

**Fix :** Remplacer `ComponentType<any>` par `ComponentType<LucideProps>` depuis `lucide-react` et supprimer tous les `as any`.

---

### [TYPES] `CheckoutModal.tsx` — `as any` x3

**Problem :** Lignes 88, 90, 94, 97 utilisent `as any` pour contourner le narrowing entre `CheckoutAppointment` et `AppointmentSummary`.

**Fix :** Créer un type union discriminé ou une fonction de narrowing typée dans `@/types/models.ts` pour accéder à `extras`, `note`, `paymentMethod` sans `as any`.

---

### [CLEAN CODE] `checkout/route.ts` POST — `console.error` de debug (ligne 41)

**Problem :** `console.error('Checkout Error:', err)` laissé dans le handler POST au lieu d'utiliser `apiErrorResponse(err)` (qui wrapping le logger correctement).

**Fix :**
```ts
// ❌ Actuel
} catch (err) {
    console.error('Checkout Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

// ✅ Fix
} catch (err) {
    return apiErrorResponse(err)
}
```

---

### [CLEAN CODE] `forgot-password/route.ts` — `console.error` de debug (ligne 40) + `prisma as PrismaClient` inutile

**Problem 1 :** `console.error('Resend API key not configured')` doit être remplacé par `logger.error(...)`.

**Problem 2 :** `const db = prisma as PrismaClient` est un cast inutile — `prisma` est déjà typé `PrismaClient` (viol de la règle "as en dernier recours documenté").

**Fix :**
```ts
// Supprimer :
const db = prisma as PrismaClient
// Utiliser prisma directement

// Remplacer :
console.error('Resend API key not configured')
// Par :
logger.error('Resend API key not configured')
```

---

### [CLEAN CODE] `users/route.ts` — `prisma as PrismaClient` inutile (ligne 6)

**Problem :** Même pattern que `forgot-password` : `const db = prisma as PrismaClient`. Cast non documenté et inutile.

**Fix :** Utiliser `prisma` directement (même type).

---

### [ZOD MANQUANT] `appointments/route.ts` PUT — Corps non validé via Zod

**Problem :** Le handler `PUT` (ligne 122) déstructure `body` directement sans validation Zod :
```ts
const { id, start, end, duration, serviceId, customerId, note, force } = body
```
Le schéma `UpdateAppointmentSchema` existe dans `@/schemas/appointments.ts` mais n'est pas utilisé ici.

**Fix :** Utiliser `UpdateAppointmentSchema.safeParse(body)` avant toute déstructuration.

---

### [ARCHITECTURE] `MobileSheet.tsx` — `onClose` passé comme prop sans ESLint-disable justifié

**Problem :** Le warning TS71007 "Props must be serializable" est contourné en silence (`// eslint-disable-next-line react-hooks/exhaustive-deps`). La prop `onClose` est une fonction non-sérialisable passée entre deux composants `"use client"`, ce qui est acceptable techniquement, mais le commentaire de suppression ne documente pas la raison.

**Fix :** Ajouter un commentaire explicite `// RAISON: onClose est un callback client-to-client, non exposé au serveur.`

---

### [ARCHITECTURE] `MobileNav.tsx` — Import `React` manquant (implicite)

**Problem :** `menuItems.ts` importe `React` (pour `ComponentType`) mais `MobileNav.tsx` n'importe pas `React` alors que le projet cible peut ne pas avoir le JSX transform automatique activé.

**Fix :** Ajouter `import React from 'react'` dans `MobileNav.tsx` pour garantir la compatibilité.

---

## 🟡 Minor Issues

- **`Sidebar.tsx` L16 :** Double classe conflictuelle `hidden md:flex ... flex` (Tailwind warning lint). Supprimer le `flex` nu et garder uniquement `hidden md:flex flex-col`.
- **`MobileHeader.tsx` :** Deux classes background `bg-[var(--studio-bg)] bg-white` en concurrence. Garder uniquement `bg-white` ou introduire une variable Tailwind `bg-studio-bg` cohérente.
- **`MobileSheet.tsx` :** Lignes vides superflues en fin de fichier (x4). Supprimer.
- **`MobileNav.tsx` :** Lignes vides superflues en fin de fichier (x2). Supprimer.
- **`menuItems.ts` :** `import React from 'react'` importé uniquement pour le typage — utiliser `import type React from 'react'` ou simplement `import type { ComponentType } from 'react'`.

---

## 🧠 Global Recommendations

1. **LucideIcon type :** Adopter `LucideIcon` (depuis `lucide-react`) comme type standard pour toutes les icônes dans le projet — évite les `as any` et `ComponentType<any>` dans les menus, boutons et modals.
2. **Zod systématique sur tous les PUT/PATCH body :** Le PUT de `/api/appointments` est le seul handler sans validation Zod du body — appliquer la règle uniformément.
3. **`prisma as PrismaClient` à supprimer partout :** Pattern détecté dans 2 fichiers. `lib/prisma.ts` exporte déjà un client typé, ce cast crée une fausse confiance.
4. **Tests manquants pour feature mobile :** `MobileHeader` et `MobileSheet` n'ont pas de tests unitaires (Vitest + RTL). Ajouter `test/components/mobile-header.spec.tsx` et `test/components/mobile-sheet.spec.tsx` pour garantir la non-régression.
5. **`console.error` centralisé :** 2 `console.error` bruts (checkout + forgot-password) contournent le logger centralisé. Unifier via `logger.error`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Types :**
   - `menuItems.ts` : `LucideIcon` à la place de `ComponentType<any>`, supprimer tous `as any`.
   - `CheckoutModal.tsx` : Créer fonction de narrowing typée, supprimer `as any` x3.
   - `users/route.ts` + `forgot-password/route.ts` : Supprimer `prisma as PrismaClient`.

2. **Priorité 2 — Zod / Validation :**
   - `appointments/route.ts` PUT : Ajouter `UpdateAppointmentSchema.safeParse(body)`.

3. **Priorité 3 — Clean Code :**
   - `checkout/route.ts` : Remplacer `console.error` + `NextResponse` brut par `apiErrorResponse`.
   - `forgot-password/route.ts` : Remplacer `console.error` par `logger.error`.
   - `Sidebar.tsx` : Corriger classe Tailwind conflictuelle.
   - `MobileHeader.tsx` : Unifier les classes background.
   - Nettoyer lignes vides dans `MobileSheet.tsx` et `MobileNav.tsx`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Aucune faille de sécurité IDOR bloquante. Le scoping `organizationId` est correctement appliqué sur toutes les routes API auditées. Les blocages sont des violations de type (`any`) et de clean code (`console.error`, `prisma as PrismaClient`, PUT sans Zod) à corriger avant merge en `main`.

Lancer `/autofixer` pour appliquer automatiquement les correctifs.

