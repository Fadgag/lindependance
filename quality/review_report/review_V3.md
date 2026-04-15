# 🧪 Next.js Code Review Report - V3

**Date :** 2026-04-15
**Périmètre :** Feature `quick-customer` — création client inline dans le picker de RDV
**Fichiers audités :**
- `src/components/calendar/CustomerPicker.tsx`
- `src/components/customers/QuickCustomerModal.tsx`
- `src/components/ui/BaseModal.tsx`
- `src/components/ui/ModalStackProvider.tsx`
- `src/components/calendar/AppointmentModal.tsx`
- `src/components/AppointmentScheduler.tsx`
- `src/app/api/customers/route.ts`
- `src/schemas/customers.ts`

---

## 🧾 Summary
- **Score:** 42/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 0 | Major: 5 | Minor: 6

---

## 🔴 Critical Issues (Blocking)

_Aucune faille IDOR détectée._ L'API `POST /api/customers` vérifie correctement `session.organizationId` et scope tous les accès Prisma. La dédup par téléphone est au sein de l'org. Le scoping est conforme.

---

## 🟠 Major Issues

### [DATA] Phone obligatoire en schema / optionnel dans l'UI — bug silencieux 400
**Problem :** `CustomerCreateSchema` déclare `phone: z.string().min(1)` (obligatoire). Dans `CustomerPicker`, le champ téléphone est labellisé "Téléphone" et envoyé comme `phone: createPhone || null`. Si l'utilisateur ne renseigne pas de téléphone, le body envoie `{ phone: null }` → l'API retourne HTTP 400 (échec Zod). L'utilisateur voit "Erreur lors de la création" sans comprendre pourquoi.
**Fichiers :** `src/schemas/customers.ts:6`, `src/components/calendar/CustomerPicker.tsx:66`
**Fix :** Rendre le champ `phone` optionnel dans le schema :
```ts
phone: z.string().min(1).optional().nullable()
```
ET dans le body POST, ne l'envoyer que s'il est non-vide :
```ts
body: JSON.stringify({ firstName, lastName, ...(createPhone ? { phone: createPhone } : {}) })
```

---

### [ARCHITECTURE] Spec non-respectée : Server Action absent
**Problem :** La spec `specs/features/quick-customer.md` exige une **Server Action `createClientAndReturn`** dans le Logic Layer. L'implémentation actuelle fait un `fetch('/api/customers')` brut depuis le composant client `CustomerPicker`. La logique métier (création client) est dans l'UI, ce qui viole le principe DRY et l'architecture imposée.
**Fichiers :** `src/components/calendar/CustomerPicker.tsx:62-99`
**Fix :** Créer `src/actions/createCustomerAndReturn.ts` avec `'use server'` qui appelle Prisma directement, et l'importer dans `CustomerPicker`.

---

### [CLEAN-CODE] Logs de debug en production
**Problem :** `QuickCustomerModal.tsx` contient 4 `console.info`/`console.error` de debug ajoutés lors du troubleshooting. Violation directe des Global Rules ("Pas de Logs de Debug : Supprimer tous les `console.log` avant de finaliser").
**Fichiers :** `src/components/customers/QuickCustomerModal.tsx:19, 44, 51, 67`
**Fix :** Supprimer toutes ces lignes.

---

### [TYPES] Cast `as CustomerType` sans commentaire RAISON
**Problem :** `setSelectedCustomer(cust as CustomerType)` dans `AppointmentModal.tsx`. Global Rules : "Le mot-clé `as` ne doit être utilisé qu'en dernier recours et doit être documenté par un commentaire `// RAISON: ...`". Aucun commentaire présent.
**Fichiers :** `src/components/calendar/AppointmentModal.tsx` (bloc `onCreatedAction`)
**Fix :**
```tsx
// RAISON: cust provient de l'API /api/customers qui retourne le type complet CustomerType
setSelectedCustomer(cust as CustomerType)
```
Ou mieux : typer `onCreatedAction` directement avec `CustomerType` pour éliminer le cast.

---

### [DEAD-CODE] `QuickCustomerModal.tsx` — composant orphelin
**Problem :** Le fichier `src/components/customers/QuickCustomerModal.tsx` a été créé en début de session puis rendu inutile par le passage à l'inline form dans `CustomerPicker`. Il n'est plus importé nulle part. Code mort, risque de confusion pour les futurs développeurs.
**Fichiers :** `src/components/customers/QuickCustomerModal.tsx`
**Fix :** Supprimer le fichier. Si une modale séparée est un jour nécessaire, la recréer depuis zéro.

---

## 🟡 Minor Issues

- **[A11y/TIMING]** `BaseModal` : lors du premier render, `isTop = false` (modal pas encore dans la stack — l'`useEffect` s'exécute après le paint). La modal est rendue avec `aria-hidden={true}` et `pointerEvents: none` pendant ~1 frame. Imperceptible visuellement mais mauvais pour les screen-readers.
- **[CSS]** `motion.div` dans `BaseModal` a `overflow: hidden`. Le dropdown du `CustomerPicker` (position absolute) peut être coupé sur des écrans petits où le dropdown dépasse la card. Changer en `overflow: visible` ou gérer via un Portal côté dropdown.
- **[TESTS]** Zéro test ajouté pour la feature. La spec impose un protocole TDD (Test → Code → UI). Les cas `submitCreate`, `onCreatedAction`, `customers:updated`, et la gestion du 409 ne sont pas testés.
- **[LINT]** `onSelect: (id: string) => void` dans `CustomerPicker` déclenche TS71007 (prop non sérialisable). Renommer en `onSelectAction` pour conformité Next.js (warning répété à chaque compilation).
- **[STATE]** `localCustomer` dans `CustomerPicker` n'est jamais réinitialisé quand un autre client est sélectionné manuellement. Pas de bug actif (shadowed par `customers.find()`), mais dette technique si la liste se rechargé avec un autre client ayant le même id.
- **[UX]** Pas de `aria-label` ni `role` sur les inputs du formulaire inline dans `CustomerPicker`. Inaccessible aux utilisateurs avec lecteur d'écran.

---

## 🧠 Global Recommendations

1. **Server Actions pour les mutations** : Toute création/modification d'entité (customer, appointment) devrait passer par une Server Action typée avec Zod côté serveur, pas un `fetch` brut depuis le client. Cela sécurise, type et centralise la logique.
2. **Supprimer la dette de logs** : Avant chaque merge, passer un `grep -r "console\." src/` pour purger les logs de debug.
3. **Implémenter les tests manquants** : Minima acceptables : un test unitaire `CustomerPicker.spec.tsx` avec RTL couvrant les cas création OK, 409, et reset du formulaire.
4. **`BaseModal` — timing `isTop`** : Résoudre en initialisant le stack synchroniquement dans un `ref` ou en utilisant `useLayoutEffect` au lieu de `useEffect` pour `registerOpen`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Données :** Corriger `CustomerCreateSchema` pour rendre `phone` optionnel. Mettre à jour `CustomerPicker` pour ne pas envoyer `phone: null`.
2. **Priorité 2 — Clean Code :** Supprimer les `console.info`/`console.error` dans `QuickCustomerModal.tsx`. Supprimer le fichier `QuickCustomerModal.tsx` entier (dead code).
3. **Priorité 3 — Types :** Documenter le cast `as CustomerType` avec commentaire `// RAISON:`. Renommer `onSelect` en `onSelectAction` dans `CustomerPicker`.
4. **Priorité 4 — Architecture :** Créer `src/actions/createCustomerAndReturn.ts` (Server Action) et migrer la logique `fetch` de `CustomerPicker.submitCreate` vers cette action.
5. **Priorité 5 — Tests :** Ajouter `test/components/CustomerPicker.spec.tsx` avec les cas minimaux.

---

## 🧮 Final Decision

**REJECTED** — 5 issues MAJOR bloquent le merge.

Priorité immédiate avant retest : corrections Priorité 1 (bug silencieux 400 phone) et Priorité 2 (dead code + logs debug). Le reste peut être adressé en post-merge avec une issue de tracking.

