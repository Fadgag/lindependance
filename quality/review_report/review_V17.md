# 🧪 Next.js Code Review Report - V17

## 🧾 Summary
- **Score:** 78/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 3 | Minor: 4
- **Branche analysée :** `feature/dashboard-upgrade-billing` (diff vs `main`, SHA `e483dfd`)
- **Fichiers audités :** tous les fichiers modifiés sur la branche (13 fichiers)

---

## ✅ Critiques résolues (depuis V16)
- ✅ IDOR corrigé dans `/api/dashboard/summary` : bypass `orgId` conditionné à `NODE_ENV !== 'production'`.
- ✅ Route de test bloquée en production par guard `NODE_ENV === 'production'` → 404.
- ✅ `(a as any)` remplacé par un type local `AppointmentRow` documenté.
- ✅ Validation Zod des `searchParams` ajoutée dans `details/page.tsx`.
- ✅ `DashboardShell.tsx` entièrement restauré avec accessibilité conditionnelle sur les cards.

---

## 🟠 Major Issues

### [QUALITÉ/BUG] Double guard `redirect` dans `details/page.tsx`
**Problem :** Le guard d'auth est écrit deux fois :
```typescript
// Ligne 10
if (!session?.user?.organizationId) redirect('/auth/signin')
// Ligne 12 — doublon, le premier redirect ne stop pas toujours
if (!session?.user?.organizationId) {
  redirect('/auth/signin')
  return null
}
```
Le premier `redirect` (ligne 10) est sans `return null` — dead code + confusion. Conserver **uniquement** le bloc lignes 12–15 (avec `return null`) et supprimer la ligne 10.

**Fix :**
```typescript
const session = await auth()
if (!session?.user?.organizationId) {
  redirect('/auth/signin')
  return null
}
```

---

### [SPEC INCOMPLETE] Aucun contrôle de filtre UI sur `/dashboard/details`
**Problem :** La spec `dashboard-upgrade.md` exige un filtre rapide "Prestations uniquement / Ventes uniquement". La page actuelle accepte `?filter=` via l'URL mais aucun bouton/toggle n'est rendu. La `filter` query string est 100% invisible pour l'utilisateur final.
**Fichier :** `src/app/dashboard/details/page.tsx`
**Fix :** Ajouter un composant client `DetailsFilterBar` (léger) avec 3 boutons linkant vers `?filter=all`, `?filter=services`, `?filter=products`. Injecter dans la page au-dessus du tableau.

---

### [DETTE TECHNIQUE] `$executeRawUnsafe` dans le test helper — injection SQL potentielle
**Problem :** `prisma.$executeRawUnsafe('UPDATE "Appointment" SET "productsTotal" = $1 WHERE id = $2', ...)` utilise `$executeRawUnsafe`. Même si les paramètres sont positionnels et sûrs ici, la règle d'entreprise prescrit des opérations atomiques via Prisma. Ce raw SQL ne sera plus nécessaire une fois le client Prisma régénéré après migration.
**Fichier :** `src/app/api/test/create-billing-test-data/route.ts` ligne 44
**Fix :** Migrer vers `prisma.appointment.update()` dès que `npx prisma generate` est relancé après la migration `add_appointment_soldProducts_json`. Documenter avec un `// TODO: replace with prisma.update() after prisma generate`.

---

## 🟡 Minor Issues

- **Fichier `billing-accuracy.spec.ts` toujours présent** : Le fichier `.ts` utilise `require()` CommonJS et est inclus dans le `tsconfig.json`. La version `.js` est maintenant l'exécutable canonique. Soit supprimer `.spec.ts`, soit le vider et documenter clairement qu'il est un placeholder non-fonctionnel.
- **`from`/`to` non validés en tant que dates valides** : Zod valide que `from` et `to` sont des strings mais pas qu'elles parsent en dates valides. `new Date("invalid-date")` → `Invalid Date` → Prisma query silencieusement brisée. Ajouter `.refine(v => !isNaN(new Date(v).getTime()))` ou utiliser `z.coerce.date()`.
- **`getDashboardDetails` : filtre `services` toujours un no-op** : Le bloc `if (filter === 'services')` est vide avec un commentaire depuis V16. Non implémenté = comportement identique à `'all'` → trompeur pour l'utilisateur qui clique sur "Prestations uniquement".
- **`src/app/layout.tsx` dans le diff** : Ce fichier est listé dans le diff mais ne devrait pas avoir été modifié par cette feature. Vérifier qu'aucun changement non lié n'y a été introduit accidentellement.

---

## 🧠 Global Recommendations

1. **Prisma client stale** : La migration `add_appointment_soldProducts_json` est dans `prisma/schema.prisma` mais pas encore exécutée. Jusqu'à ce que `prisma migrate dev` + `prisma generate` soient lancés, le champ `productsTotal` n'existe pas en DB et les raw SQL updates sont les seuls moyens d'écrire ce champ. Bloquer le déploiement jusqu'à résolution.
2. **playwright.config.ts manquant** : Le test e2e `.spec.js` ne peut pas tourner sans config Playwright. Minimaliste à ajouter :
   ```typescript
   import { defineConfig } from '@playwright/test'
   export default defineConfig({ testDir: './tests/e2e', timeout: 30000 })
   ```
3. **Nettoyage des données de test** : La route `create-billing-test-data` crée des organisations et clients réels dans la DB sans mécanisme de cleanup. Ajouter un endpoint de teardown ou utiliser Prisma transactions (rollback) pour isoler les tests.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 :** Supprimer la ligne 10 de `details/page.tsx` (double guard orphelin).
2. **Priorité 2 :** Ajouter le composant `DetailsFilterBar` dans `details/page.tsx`.
3. **Priorité 3 :**
   - Valider `from`/`to` comme dates avec Zod `.refine()`.
   - Implémenter le filtre `'services'` dans `getDashboardDetails`.
   - Ajouter `// TODO: replace with prisma.update() after prisma generate` sur le raw SQL.
   - Créer `playwright.config.ts`.
   - Documenter `billing-accuracy.spec.ts` ou le supprimer.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Pas de bloquants sécurité. 3 majeurs à corriger avant merge, notamment le double guard (bug potentiel) et le filtre UI manquant (spec non respectée).

