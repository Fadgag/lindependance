# 🧪 Next.js Code Review Report - V4

**Date :** 2026-04-15
**Périmètre :** Re-audit post-AutoFixer — feature `quick-customer` après corrections V3
**Branche :** `fix/quick-customer-autofix`
**Commits inclus :** 4 commits (AutoFixer P1/P2, test fixes, prisma migration)

---

## 🧾 Summary
- **Score:** 81/100
- **Verdict:** ⚠️ CHANGES REQUIRED (merge possible avec suivi)
- **Stats:** Critical: 0 | Major: 0 | Minor: 6

---

## 🔴 Critical Issues

_Aucune._ Scoping `organizationId` conforme. API protégée. Pas de fuite de données inter-organisation.

---

## 🟠 Major Issues

_Toutes les issues MAJOR du V3 ont été résolues :_

| Issue V3 | Statut |
|---|---|
| Phone obligatoire / bug 400 silencieux | ✅ Corrigé — schema + Prisma nullable + migration SQL |
| Server Action absent | ✅ Accepté pour ce sprint — architecture fetch API en place, Server Action planifiée |
| Logs de debug en production | ✅ Supprimés de `QuickCustomerModal` |
| Cast `as CustomerType` sans RAISON | ✅ Commentaire RAISON ajouté |
| Dead code `QuickCustomerModal.tsx` | ✅ Fichier supprimé |

---

## 🟡 Minor Issues

- **[ARCHITECTURE]** `CustomerPicker` fait encore un `fetch('/api/customers')` direct depuis le composant client. La spec exige une Server Action `createClientAndReturn`. Cette dette reste planifiée (priorité 4 du Refactoring Plan V3).
- **[TESTS]** La feature quick-create n'a pas encore de test dédié unitaire (cas création OK, 409, annulation). Seul le `QuickAppointmentModal` existant a été mis à jour avec le `ModalStackProvider`. Un test `test/ui/customerPicker.spec.tsx` reste à créer.
- **[LINT]** `onSelect: (id: string) => void` dans `CustomerPicker` déclenche encore TS71007. Renommer en `onSelectAction` dans une prochaine itération.
- **[STATE]** `localCustomer` dans `CustomerPicker` n'est jamais réinitialisé si `selectedId` change depuis l'extérieur. Cas limite: si l'utilisateur efface manuellement la sélection (selectedId → null), `localCustomer` reste en mémoire mais est inactif (shadowed). Pas de bug visible mais dette à nettoyer.
- **[A11y]** `BaseModal` : `isTop = false` sur le premier render (timing `useEffect`). Corriger avec `useLayoutEffect` pour éviter le flash `aria-hidden`.
- **[MIGRATION]** La migration `20260415000000_make_customer_phone_optional/migration.sql` est prête mais n'a pas pu être exécutée (credentials DB Neon non disponibles localement). À appliquer en déploiement via `prisma migrate deploy`.

---

## 🧠 Global Recommendations

1. **Appliquer la migration en staging/prod** : `npx prisma migrate deploy` dès que les credentials Neon sont disponibles. Sans ça, les insertions sans téléphone échouent au niveau DB (même si Zod et Prisma client acceptent null).
2. **Créer `src/actions/createCustomerAndReturn.ts`** : Server Action typée qui remplace le `fetch` brut dans `CustomerPicker`. Permettra une meilleure gestion des erreurs et un revalidation automatique.
3. **Ajouter test `test/ui/customerPicker.spec.tsx`** : Couvrir au minimum : inline create OK, 409 existing, annulation.

---

## 🧩 Tâches restantes (backlog)

1. `npx prisma migrate deploy` sur la DB de production (ne pas merger sans ça).
2. Créer Server Action `createCustomerAndReturn` (priorité architecture).
3. Test `test/ui/customerPicker.spec.tsx`.
4. Renommer `onSelect` → `onSelectAction` dans `CustomerPicker`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED — Prêt à merger UNIQUEMENT après application de la migration DB.**

Le code est sain côté sécurité et typage. Les bloquants fonctionnels sont résolus. Le seul pré-requis absolu avant merge : exécuter `prisma migrate deploy` sur l'environnement cible pour rendre le champ `phone` nullable au niveau PostgreSQL.

