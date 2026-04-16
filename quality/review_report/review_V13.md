# Review Report V13 — 2026-04-16

## Score global : 74/100

---

## 🔴 Critique (sécurité)

### [SEC-01] XSS via `allowHTML: true` dans Tippy.js — `AppointmentScheduler.tsx` l. 184
`tippy` est configuré avec `allowHTML: true` et injecte directement dans le HTML des valeurs issues des `extendedProps` (titre, nom client, nom service, prix). Si ces données contiennent des balises HTML (saisies utilisateur stockées en base), une injection XSS côté client est possible.
**Correction :** Échapper les valeurs via une fonction `escapeHtml()` avant interpolation, ou utiliser l'API `content` de tippy avec un nœud DOM créé programmatiquement (sans `allowHTML`).

### [SEC-02] Update non atomique avec vérification d'appartenance — `appointments/route.ts` PUT, l. 142–175
La vérification IDOR (`findFirst` avec `organizationId`) et le `update` (`where: { id }` seul, l. 165) sont deux requêtes Prisma séparées, non atomiques. Une race condition permet théoriquement à un attaquant de modifier un rendez-vous d'une autre organisation.
**Correction :** Remplacer par `prisma.appointment.updateMany({ where: { id, organizationId } })` ou encapsuler dans `prisma.$transaction`.

### [SEC-03] `serviceId` non vérifié par rapport à l'organisation — `appointments/route.ts` POST, l. 97
`prisma.service.findUnique({ where: { id: serviceId } })` ne filtre pas par `organizationId`. Un utilisateur authentifié peut référencer un service appartenant à une autre organisation.
**Correction :** Ajouter `organizationId: session.user.organizationId` dans le `where` du `findUnique` du service.

### [SEC-04] Cast `any` sur `soldProducts` — `dashboard.service.ts` l. 85
`(a as any).soldProducts` contourne le typage strict et viole la règle 0% `any`.
**Correction :** Remplacer par `a.soldProducts as Prisma.JsonValue | null` après avoir ajouté le champ dans le `select/include` Prisma.

---

## 🟠 Majeur (bugs, performance)

### [PERF-01] Import dynamique inutile sur PUT — `appointments/route.ts` l. 133
`UpdateAppointmentSchema` est importé dynamiquement (`await import(...)`) à chaque requête PUT alors qu'il est défini dans le même module.
**Correction :** Utiliser l'import statique en tête de fichier.

### [PERF-02] Pas d'`AbortController` sur `datesSet` — `AppointmentScheduler.tsx` l. 144–151
En navigation rapide, plusieurs requêtes parallèles peuvent être en vol ; la dernière réponse reçue peut écraser l'état. Le guard `lastRangeRef` ne couvre que les doublons identiques.
**Correction :** Stocker un `AbortController` dans une `ref` et l'annuler avant chaque nouveau fetch dans `datesSet`.

### [BUG-01] PUT client ne met à jour que `Note` — `customers/route.ts`
L'endpoint PUT client ignore `firstName`, `lastName`, `phone` — il est impossible de modifier les informations principales d'un client.
**Correction :** Étendre `CustomerUpdateSchema` pour inclure les champs éditables.

### [BUG-02] Clé React instable sur lignes produits — `CheckoutModal.tsx` l. 309
`key={p.productId + i}` combine ID et index. Si un produit est retiré du milieu de la liste, les keys se décalent et React re-rend des composants inattendus.
**Correction :** Utiliser uniquement `key={p.productId}`.

---

## 🟡 Mineur (DRY, types)

### [DRY-01] `eventDrop` et `eventResize` dupliqués — `AppointmentScheduler.tsx` l. 217–277
Les deux handlers partagent exactement le même corps de requête `fetch PUT /api/appointments` (~30 lignes dupliquées).
**Correction :** Extraire une fonction `updateAppointmentTiming(event, revert)`.

### [DRY-02] Import `Product` en double — `CheckoutModal.tsx` l. 7–8
`Product` est importé deux fois depuis `@/types/models`.
**Correction :** Fusionner les deux lignes d'import.

### [TYPE-01] Type local `InitialData` duplique `InitialAppointmentData` — `AppointmentModal.tsx` l. 28–39
Type local structurellement identique à `InitialAppointmentData` de `@/types/models`. Divergence silencieuse à terme.
**Correction :** Importer et utiliser `InitialAppointmentData` depuis `@/types/models`.

### [TYPE-02] `organizationId` narrowé avec `as string` — routes divers
Le cast `as string` contourne le typage après guard au lieu de laisser TypeScript l'affiner.
**Correction :** Utiliser `session.user.organizationId!` après le guard ou un type guard dédié.

### [CLEAN-01] Bloc `if` vide dans DELETE checkout — `appointments/route.ts` l. 224–228
Le bloc `if (finalPrice > 0 || isPaidStatus) { // journalisation future }` ne fait rien et génère une confusion.
**Correction :** Supprimer ou remplacer par un `// TODO:` sur une ligne.

### [CLEAN-02] `pad` définie dans la fonction async — `dashboard.service.ts` l. 52
Fonction utilitaire recréée à chaque appel.
**Correction :** Extraire au niveau module.

---

## ✅ Points positifs

- **Anti-IDOR systématique** : tous les endpoints filtrent par `organizationId` sur chaque requête Prisma.
- **Transaction atomique au checkout** : `prisma.$transaction` garantit la cohérence stock/RDV avec gestion du stock insuffisant (409).
- **Validation Zod complète** : `CreateAppointmentSchema`, `UpdateAppointmentSchema`, `CheckoutInputSchema` couvrent tous les inputs API.
- **AbortController au chargement initial** : `AppointmentScheduler` annule proprement les requêtes de démarrage.
- **Guard `customerPackage` scope-safe** : `updateMany` filtre via `customer: { organizationId }`.
- **Séparation des responsabilités** : logique dashboard extraite dans `services/dashboard.service.ts`.
- **`parseJsonField` centralisé** : désérialisation des champs JSON Prisma mutualisée dans `@/lib/parseAppointmentJson`.
- **Suppression du RDV protégée** : CheckoutModal masque le bouton supprimer si `isPaid`.
- **Boucle agenda corrigée** : guard `lastRangeRef` sur `datesSet` supprime les requêtes identiques répétées.

---

## Récapitulatif des priorités

| ID | Sévérité | Fichier | Action |
|----|----------|---------|--------|
| SEC-01 | 🔴 | `AppointmentScheduler.tsx` | Supprimer `allowHTML` / échapper HTML |
| SEC-02 | 🔴 | `appointments/route.ts` | Rendre le PUT atomique avec `organizationId` |
| SEC-03 | 🔴 | `appointments/route.ts` | Filtrer `serviceId` par `organizationId` |
| SEC-04 | 🔴 | `dashboard.service.ts` | Remplacer `as any` par type Prisma |
| PERF-01 | 🟠 | `appointments/route.ts` | Supprimer l'import dynamique inutile |
| PERF-02 | 🟠 | `AppointmentScheduler.tsx` | AbortController sur `datesSet` |
| BUG-01 | 🟠 | `customers/route.ts` | Étendre le schema PUT |
| BUG-02 | 🟠 | `CheckoutModal.tsx` | Fixer la key React |
| DRY-01 | 🟡 | `AppointmentScheduler.tsx` | Extraire `updateAppointmentTiming` |
| DRY-02 | 🟡 | `CheckoutModal.tsx` | Fusionner imports |
| TYPE-01 | 🟡 | `AppointmentModal.tsx` | Utiliser `InitialAppointmentData` |
| TYPE-02 | 🟡 | routes | Type guard propre |
| CLEAN-01 | 🟡 | `appointments/route.ts` | Supprimer bloc vide |
| CLEAN-02 | 🟡 | `dashboard.service.ts` | Déplacer `pad` au niveau module |

