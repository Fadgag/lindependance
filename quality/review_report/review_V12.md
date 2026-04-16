# 🧪 Next.js Code Review Report - V12

## 🧾 Summary
- **Score:** 64/100
- **Verdict:** ❌ BLOCK
- **Scope:** Fichiers modifiés localement (non encore commités) — diff `git status --short`
- **Stats:** Critical: 1 | Major: 4 | Minor: 5

---

## 🔴 Critical Issues (Blocking)

### [SÉCURITÉ] Corruption silencieuse multi-fichiers — Surface d'attaque élargie
**Violation :** `global-rules.md` — Migration non-destructive, intégrité des fichiers, type-safety.  
**Impact :** Plusieurs fichiers sources (`route.ts`, `dashboard.service.ts`, `schemas/appointments.ts`, `layout.tsx`) ont été corrompus par des patchs conflictuels : fragments de code orphelins imbriqués dans d'autres blocs, imports au milieu de fonctions, JSX invalide. Ces corruptions ont provoqué des erreurs de parsing Turbopack en production (`Expected '</', got ':'`, `Expression expected`). La correction manuelle s'est avérée nécessaire après un reset involontaire de la base Neon. Ce type de corruption peut masquer des failles IDOR ou introduire du code mort non audité.  
**Fix :**
1. Mettre en place un hook pre-commit `pnpm lint && pnpm run build` avant tout push.
2. Protéger les migrations via `prisma migrate deploy` (jamais `migrate dev` sur prod).
3. Ajouter des tests d'intégration API (au moins smoke tests) pour `/api/appointments` et `/api/stats/dashboard`.

---

## 🟠 Major Issues

### [UI] `DashboardShell.tsx` — Duplication JSX (nested Live Dashboard badge)
**Problem :** Lignes 108–119 : le badge "Live Dashboard" est imbriqué en doublon dans lui-même (`<div className="hidden md:flex">` à l'intérieur d'un autre `<div className="hidden md:flex">`). Cela crée du DOM redondant et un affichage visuellement cassé sur desktop.  
**Fix :** Supprimer les lignes 108–114 (doublon interne). Garder seulement l'instance extérieure (l. 102–107) et déplacer le badge TVA (l. 115–119) au même niveau frère.

### [ARCHITECTURE] `dashboard.service.ts` — Logique `groupBy` morte
**Problem :** Le service tente une stratégie `groupBy` sur `startDate` (champ `String?`) puis bascule sur `findMany` si `groupBy` n'est pas disponible. En pratique :  
- Le champ `startDate` n'est pas fiable (String ISO non indexé, populé uniquement si explicitement setté).  
- La branche `groupedRows` ne calcule pas `totalRealizedServices`, `totalRealizedProducts`, `totalTaxCollected` — ces valeurs restent à 0 si groupBy est utilisé.  
- Cette dette produit des KPIs TVA/produits faux selon l'environnement.  
**Fix :** Supprimer la branche `groupBy`/`prismaDelegate`. Utiliser exclusivement `findMany` avec `startTime` (DateTime indexé). Supprimer le type `AppointmentGroupByDelegate` de `models.ts` si inutilisé.

### [TYPES] `models.ts` — `AppointmentSummary.extendedProps` contient `[key: string]: unknown`
**Problem :** La présence de `[key: string]: unknown` dans `extendedProps` (ligne 121) désactive l'inférence de types sur tout ce champ et contredit la règle `Zéro unknown` sauf pour `catch`.  
**Fix :** Typer explicitement toutes les clés utilisées et supprimer l'index signature.

### [TYPES] `CheckoutAppointment` — Dualité `note`/`Note` non résolue
**Problem :** `CheckoutAppointment` expose à la fois `note?: string` et `Note?: string` (legacy Prisma). Idem dans `Customer` (interface) vs `Client` (interface). Cette dualité force du code défensif dans `CheckoutModal.tsx` (ligne 127–129) et est une source de bugs silencieux.  
**Fix :** Normaliser vers `note` minuscule dans le schéma Prisma (`Note -> note` via migration) et supprimer le champ legacy de tous les types.

---

## 🟡 Minor Issues

- **`scripts/checkAppointments.js`** : script de debug commité dans le repo. À déplacer dans `.gitignore` ou supprimer avant déploiement.
- **`route.ts` appointments/GET** : le filtre `.filter((a) => a.startTime)` est correct mais redondant avec le schéma Prisma (champ non-nullable). Documenter ou retirer.
- **`DashboardShell.tsx`** : le badge TVA (`summary.totalTaxCollected ?? 0`) s'affiche même si 0€ — UI trompeuse pour les salons sans produits taxés. Conditionner l'affichage à `totalTaxCollected > 0`.
- **`customers/route.ts`** : `const db = prisma` (ligne 9) est un alias inutile. Utiliser directement `prisma`.
- **`CheckoutModal.tsx`** : `recentProductIds` déclaré mais jamais lu pour trier `availableProducts` (dans `ProductPicker`). Le MVP localStorage est inerte côté tri — à brancher ou supprimer.

---

## 🧠 Global Recommendations

1. **Pre-commit guard** : Ajouter `husky` + `lint-staged` avec `pnpm run build` pour bloquer les commits qui cassent le parsing.
2. **Smoke tests API** : Au minimum un test Vitest pour `GET /api/appointments` et `GET /api/stats/dashboard` qui vérifie le shape de la réponse — cela aurait détecté les corruptions plus tôt.
3. **Migration sécurisée** : Documenter dans `AGENTS.md` la procédure : snapshot Neon → `prisma migrate deploy` → validation. Ne jamais `migrate dev` contre la DB de production.
4. **Supprimer `groupBy` path** : La branche `prismaDelegate.groupBy` est une dette technique active qui produit des calculs incomplets (TVA, produits) dans certains environnements.
5. **Normaliser `Note` → `note`** : Migration mineure mais bloquante pour la lisibilité et la suppression de code défensif.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Bug UI (DashboardShell)** : Supprimer le doublon JSX `Live Dashboard` imbriqué (lignes 108–114).
2. **Priorité 2 — Service (dashboard.service.ts)** : Supprimer la branche `groupBy` et simplifier vers `findMany` uniquement. Corriger le calcul des totaux TVA/produits.
3. **Priorité 3 — Types** : Supprimer `[key: string]: unknown` de `AppointmentSummary.extendedProps`. Supprimer alias `db = prisma`.
4. **Priorité 4 — Cleanup** : Ajouter `scripts/checkAppointments.js` au `.gitignore`. Conditionner l'affichage TVA. Brancher `recentProductIds` sur le tri `ProductPicker`.

---

## 🧮 Final Decision

**REJECTED — Score 64/100**

La corruption multi-fichiers en production est un incident sévère. Le bug de duplication JSX dans `DashboardShell` est visible en production. La branche `groupBy` produit des KPIs faux. Ces trois points doivent être corrigés avant tout déploiement.

