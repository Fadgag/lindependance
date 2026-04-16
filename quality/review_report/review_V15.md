ou# Review Report V15 — 2026-04-16

## Score global : 93/100 ↑ (+7 vs V14)

---

## ✅ Améliorations confirmées depuis V14

| ID V14 | Statut | Correction effectuée |
|--------|--------|----------------------|
| BUG-01 | ✅ Résolu | `CustomerUpdateSchema` étendu — `firstName`, `lastName`, `phone` modifiables |
| BUG-03 | ✅ Résolu | `deleteMany({ id, organizationId })` — DELETE atomique et scopé |
| BUG-04 | ✅ Résolu | Bloc `if` vide remplacé par un vrai `return 403` pour les RDV payés |
| TYPE-03 | ✅ Résolu | `catch (e)` → `catch {}` (variable inutilisée supprimée) |
| CLEAN-03 | ✅ Résolu | `parseJsonField` appelé une seule fois par RDV, résultat réutilisé |
| PERF-03 | ✅ Résolu | GET utilise `select` ciblé pour service et customer |

---

## 🟠 Majeur restant (1)

### [BUG-05] DELETE paid appointment seulement contrôlé si `from === 'checkout'`
La protection contre la suppression des RDV payés (l. 234) n'est appliquée **que** si `from === 'checkout'`. Un appel DELETE direct (sans `from`) ou depuis l'agenda (`AppointmentModal.handleDelete`) peut supprimer un RDV payé.
**Correction :** Déplacer la vérification PAID **avant** le check `from`, de façon inconditionnelle.

---

## 🟡 Mineur (DRY, types)

### [DRY-01] `eventDrop` et `eventResize` toujours dupliqués — `AppointmentScheduler.tsx`
Même corps de requête `fetch PUT /api/appointments` dans les deux handlers (~30 lignes).
**Correction :** Extraire `updateAppointmentTiming(event, revert, errorMsg)`.

### [TYPE-01] Type local `InitialData` duplique `InitialAppointmentData` — `AppointmentModal.tsx`
Structure identique à `InitialAppointmentData` de `@/types/models`.
**Correction :** Remplacer par import depuis `@/types/models`.

### [TYPE-02] `organizationId as string` dans tous les handlers
Pattern répété 8×, cast fragile. Centraliser dans un helper utilitaire.
**Correction :**
```ts
// lib/auth-guard.ts
export function getOrgId(session: Session): string {
  if (!session?.user?.organizationId) throw new Error('Unauthorized')
  return session.user.organizationId
}
```

### [MINOR-01] GET appointments : `setHours` mute les objets date en place
`startDate.setHours(0,0,0,0)` et `endDate.setHours(23,59,59,999)` mutent les objets créés par `new Date(param)`. Préférable de créer des copies immutables pour éviter des bugs difficiles à tracer.
**Correction :**
```ts
const startDate = new Date(new Date(startParam).setHours(0,0,0,0))
```

### [MINOR-02] `CustomerUpdateSchema` : `Record<string, unknown>` utilisé pour le dynamic update
L'objet `dataToUpdate` est casté `Prisma.CustomerUpdateInput` après avoir été construit comme `Record<string, unknown>`. Fragile — un champ mal nommé passera sans erreur TypeScript.
**Correction :** Construire directement un objet typé `Partial<Prisma.CustomerUncheckedUpdateInput>`.

---

## ✅ Points positifs (maintenus + nouveaux)

- **Anti-IDOR complet** : GET/POST/PUT/DELETE filtrés par `organizationId`. DELETE utilise maintenant `deleteMany` scopé.
- **Blocage RDV payé** : `return 403` si `finalPrice > 0 || isPaidStatus` dans le flux checkout.
- **Payload DB optimisé** : GET appointments utilise `select` ciblé — moins de données réseau.
- **Zero double-parsing** : `extrasParsed` et `soldParsed` calculés une fois et réutilisés dans `extendedProps`.
- **`CustomerUpdateSchema` complet** : les 4 champs éditables sont gérés avec partial update.
- **Zod + Prisma typing** : `Prisma.CustomerUpdateInput` utilisé pour le cast (évite `any`).
- **XSS tippy résolu** : DOM nodes sécurisés.
- **Boucle agenda corrigée** : `AbortController` + `lastRangeRef` sur `datesSet`.
- **0% any** : aucun `as any` subsistant dans les fichiers audités.
- **Séparation des responsabilités** : dashboard service extrait, logic métier hors routes API.

---

## Récapitulatif des priorités restantes

| ID | Sévérité | Fichier | Action |
|----|----------|---------|--------|
| BUG-05 | 🟠 | `appointments/route.ts` | Bloquer la suppression des RDV payés quelle que soit l'origine |
| DRY-01 | 🟡 | `AppointmentScheduler.tsx` | Extraire `updateAppointmentTiming` |
| TYPE-01 | 🟡 | `AppointmentModal.tsx` | Utiliser `InitialAppointmentData` depuis `@/types/models` |
| TYPE-02 | 🟡 | routes | Centraliser `getOrgId(session)` dans un utilitaire |
| MINOR-01 | 🟡 | `appointments/route.ts` | Éviter mutation des objets Date dans GET |
| MINOR-02 | 🟡 | `customers/route.ts` | Utiliser `Partial<Prisma.CustomerUncheckedUpdateInput>` |

