# 🧪 Next.js Code Review Report - V37

> **Scope :** Branche `fix/revenue-soldProducts-parse` vs `main` — audit post-V36
> **Date :** 2026-05-17
> **Working tree :** 2 fichiers source non-committés + 5 fichiers de docs/skills modifiés
> **Fichiers scope (diff) :** 46 fichiers (commits + working tree source)

---

## 🧾 Summary
- **Score:** 77/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 2 | Minor: 1

---

## ✅ Améliorations depuis V36

| Évolution | Résultat |
|---|---|
| Régression `title` — Critical V36 | ✅ **RÉSOLU** — `title: z.string().min(1).max(200)` restauré dans `unavailability/route.ts` |
| Tests | 139 ✅ \| 1 ❌ → **140 ✅ \| 0 ❌ \| 1 skipped** |
| `unavailability/route.ts` | ✅ Committé — n'est plus dans le working tree modifié |
| ESLint directives orphelines (V36 Minor) | ✅ **RÉSOLU** sur `useAppointments.ts` — plus de directive inutile |
| `datetime({ offset: true })` | ✅ Présent dans `appointments/route.ts` (GET) et `unavailability/route.ts` |

---

## 🔴 Critical Issues (Blocking)

> Aucun issue critique détecté.

---

## 🟠 Major Issues

### [GIT] 2 fichiers source non-committés dans le working tree

**Fichiers :**
```
M src/app/api/appointments/route.ts
M src/components/AppointmentScheduler.tsx
```

**Violation :** Code non versionné = invisible pour la CI/CD, les reviewers et l'historique. Risque de perte si rebase ou merge.

**Détail des changements non committés :**

| Fichier | Changement |
|---|---|
| `appointments/route.ts` | Ajout `{ offset: true }` sur `z.string().datetime()` pour les query params GET — fix timezone RFC3339 (idem `unavailability`) |
| `AppointmentScheduler.tsx` | Ajout `calendarRef` + préfill modal avec la vue active du calendrier (meilleure UX) — guards try/catch en place |

**Impact :** Si la branche est mergée dans cet état, ces deux corrections disparaissent silencieusement.

**Fix :**
```
git add src/app/api/appointments/route.ts src/components/AppointmentScheduler.tsx
git commit -m "fix: datetime offset on GET appointments + calendarRef prefill"
```

---

### [UX/BUG] Incohérence client–serveur sur la validation du `title` dans `UnavailabilityModal`

**Fichiers :**
- `src/components/calendar/UnavailabilityModal.tsx` (L82)
- `src/app/api/unavailability/route.ts` (L14)

**Problem :**
```typescript
// UnavailabilityModal.tsx L81-82
// Title (motif) is optional now — only require dates
const isFormInvalid = !dateFrom || !dateTo   // ← title non validé côté client
```
```typescript
// unavailability/route.ts L14
title: z.string().min(1).max(200),           // ← title encore requis côté serveur
```

**Impact :** Le bouton `BLOQUER` est activé même si le champ `Motif` est vide. L'utilisateur clique → requête POST envoyée avec `title: ""` → serveur répond 400. Le `toast.error` affiche l'erreur mais l'UX est confuse (pas de validation inline, aucun champ mis en rouge). L'intention UX (rendre le motif optionnel) est bloquée par le schéma serveur qui n'a pas été mis à jour.

**Fix — Deux options (validation humaine requise) :**
```
Option A (rendre le title vraiment optionnel) :
  - Mettre à jour le CreateSchema dans route.ts :
    title: z.string().max(200).optional().default(''),
  - Mettre à jour le test `POST title manquant` → attendre 201 au lieu de 400
  - Justifier la décision fonctionnelle dans un commit message

Option B (title redevient obligatoire côté client) :
  - Supprimer le commentaire "optional now" dans UnavailabilityModal.tsx L81
  - Ajouter la validation : const isFormInvalid = !title.trim() || !dateFrom || !dateTo
  - Ajouter un indicateur visuel (ring-red-300) sur l'input si titre vide à la soumission
```

---

## 🟡 Minor Issues

### [LOGS] `logger.info` avec `organizationId` dans le corps de requête — production privacy concern

**Fichiers :**
- `src/app/api/unavailability/route.ts` (L90-98, L112)
- `src/components/calendar/UnavailabilityModal.tsx` (L114-122)

**Problem :**
```typescript
// route.ts L90-98
logger.info('unavailability: received body', {
  title, start, end,
  startLocal: new Date(start).toString(),
  endLocal: new Date(end).toString(),
  recurrence,
  organizationId,      // ⚠️ PII loggé — orgId exposé dans les logs serveur
})
```

Le `logger` est conditionné (`NODE_ENV !== 'test'`) mais *pas* conditionné à `NODE_ENV !== 'production'`. En production, ces logs partent dans stdout/stderr et peuvent être indexés (ex: Vercel Logs, CloudWatch). L'`organizationId` est un identifiant de tenant — sa présence en clair dans les logs constitue une fuite de donnée structurelle.

**Fix :**
```typescript
// Soit retirer le champ organizationId du log :
logger.info('unavailability: received body', { title, start, end, recurrence })

// Soit conditionner les logs de debug à l'env de dev :
if (process.env.NODE_ENV === 'development') {
  logger.info('unavailability: received body', { ... })
}
```

---

## 🧠 Global Recommendations

1. **Décision fonctionnelle urgente :** Le titre (motif) d'une indisponibilité est-il obligatoire ou optionnel ? Le commentaire L81 de `UnavailabilityModal.tsx` dit "optional now" mais la spec et le schéma Zod disent "requis". Ce choix doit être formalisé et aligné côté client + serveur avant le merge.
2. **Committer les 2 fichiers restants** après validation du point 1 (éviter de mélanger déciion fonctionnelle et commit "technique").
3. **Logger purge :** Avant le merge sur main, retirer ou conditionner les `logger.info` de debug dans `route.ts` et `UnavailabilityModal.tsx`. Les logs de debug sont acceptables en `development`, pas en `production`.
4. **Coverage 91%** — Cible prochaine : tester les hooks `useCalendarData`, `useAppointmentForm` (mocks fetch). Les composants UI sont testés à 11 tests, mais les hooks restent non couverts.

---

## 📊 Bilan Tests V37

| Suite | Résultat |
|---|---|
| `test/api/unavailability.route.spec.ts` | **✅ Tous passent** (Critical V36 résolu) |
| `test/api/appointments.put.spec.ts` | 6 ✅ |
| `test/api/appointments.route.spec.ts` | 9 ✅ |
| `test/api/get.routes.spec.ts` | 9 ✅ |
| `test/api/stats.dashboard.spec.ts` | 3 ✅ |
| `test/stats/dashboard.details.spec.ts` | 9 ✅ |
| `test/stats/dashboard.periods.spec.ts` | 8 ✅ |
| `test/lib/*.spec.ts` | 27 ✅ |
| `test/unavailability.service.spec.ts` | 7 ✅ |
| `test/ui/*.spec.tsx` | 11 ✅ |
| Autres | 41 ✅ |
| **Total** | **140 ✅ \| 1 skipped \| ✅ 0 failing** |

---

## 🔒 Checklist Sécurité

| Règle | Statut |
|---|---|
| Anti-IDOR — `organizationId` sur toutes les ops Prisma | ✅ |
| Zod — toutes les entrées externes validées | ✅ (route.ts) |
| `finalPrice` — priorité sur calcul service+produits | ✅ |
| 0% `any` non documenté | ✅ (casts documentés `// RAISON:`) |
| `organizationId` jamais accepté depuis le body | ✅ |
| `title` required — schéma serveur | ✅ / ⚠️ incohérent avec UX (voir Major 2) |
| `logger.info` avec `organizationId` en production | ⚠️ Minor |

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Validation humaine requise :** Décider Option A (title optionnel) ou Option B (title obligatoire) pour `UnavailabilityModal` / `unavailability/route.ts`. L'AutoFixer *ne doit pas* prendre cette décision seul.
2. **Priorité 2 — Committer les 2 fichiers locaux :** Après validation du point 1, committer `appointments/route.ts` + `AppointmentScheduler.tsx`.
3. **Priorité 3 — Logger purge :** Supprimer/conditionner les `logger.info` de debug dans `unavailability/route.ts` et `UnavailabilityModal.tsx`.

---

## 🧮 Final Decision

**⚠️ CHANGES REQUIRED** — Score **77/100**.

0 Critical. 2 Major (git + incohérence UX/serveur). 1 Minor (logs PII).

La suite de tests est à **100% verte** — la régression Critical de V36 est corrigée. Les deux Majors sont bloquants pour le merge : les fichiers non-committés risquent d'être perdus, et l'incohérence `title` optionnel/obligatoire doit être tranchée fonctionnellement. Aucune faille de sécurité détectée dans la logique métier.

