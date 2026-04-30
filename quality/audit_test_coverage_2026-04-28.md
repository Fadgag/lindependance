# 🧪 Audit Couverture de Tests — Unitaires & E2E

> **Date :** 2026-04-28
> **Périmètre :** `test/`, `tests/`, toutes les suites Vitest + Playwright

---

## 📊 Résumé Exécutif

| Dimension | Couverture actuelle | Cible recommandée |
|---|---|---|
| **Tests unitaires (services/lib)** | 🟡 60% | 80% |
| **Tests routes API** | 🔴 15% | 70% |
| **Tests hooks** | 🔴 0% | 60% |
| **Tests composants UI** | 🟡 35% | 50% |
| **Tests E2E Playwright** | 🔴 10% | 40% |
| **Total suites actives** | 12 suites / 49 cas | — |

---

## ✅ Ce qui est bien couvert

### Services métier
| Service | Tests | Cas |
|---|---|---|
| `unavailability.service.ts` → `buildOccurrences` | ✅ Excellent | 7 cas (NONE, WEEKLY, BIWEEKLY, MONTHLY, edge case Jan30, durée, borne 6 mois) |
| `dashboard.service.ts` → `getDashboardForOrg` | ✅ Bon | 2 cas (zéros, agrégation multi-RDV) |
| `analytics.service.ts` → `getOrgDashboard` | ✅ Basique | 1 cas (timeseries 2 jours) |
| `parseSoldProducts` (lib) | ✅ Excellent | 11 cas (null, vide, malformé, calculs, JSON sérialisé) |
| `dateUtils` (lib) | ✅ Bon | 9 cas (formatForDateTimeLocal, getDefaultStart) |

### Schémas / Sécurité
| | |
|---|---|
| `CreateAppointmentSchema` — rejet `organizationId` client | ✅ 1 cas |
| `sessionsRemaining` — pattern atomique `updateMany` | ✅ 1 cas (smoke test architectural) |

### Infrastructure
| | |
|---|---|
| `proxy.ts` — auth middleware | ✅ 3 cas (bypass /auth, authentifié, redirect) |

### UI
| | |
|---|---|
| `CustomerPicker` | ✅ 8 cas (affichage liste, sélection, création, validation, 409, annulation) |
| `FloatingActionButton` | ✅ 3 cas (rendu, couleur fallback, z-index) |

### API (routes)
| | |
|---|---|
| `GET /api/stats/dashboard` | ✅ 2 cas (agrégation Decimal, isolation org) |

---

## 🔴 Zones sans couverture — Critiques

### API Routes (aucun test)

| Route | Criticité | Tests manquants prioritaires |
|---|---|---|
| `POST /api/appointments` | 🔴 Haute | Création valide, conflit 409, payload avec customerPackageId |
| `PUT /api/appointments` | 🔴 Haute | Mise à jour scoped, conflit horaire, IDOR (autre org) |
| `DELETE /api/appointments` | 🔴 Haute | Suppression scoped, rejet RDV payé, CUID invalide |
| `POST /api/unavailability` | 🔴 Haute | Création single, récurrence WEEKLY/MONTHLY, overlap |
| `DELETE /api/unavailability` | 🔴 Haute | Occurrence seule vs série entière, IDOR |
| `GET /api/appointments` | 🟠 Moyenne | Filtre start/end, isolation org, format réponse |
| `GET/POST /api/customers` | 🟠 Moyenne | CRUD scoped, doublon téléphone (409) |
| `POST /api/appointments/[id]/checkout` | 🔴 Haute | Calcul prix, décrémentation forfait, soldProducts |

### Hooks (zéro test)

| Hook | Criticité | Raison |
|---|---|---|
| `useAppointmentForm.ts` | 🟠 Moyenne | Logique init formulaire, validation horaires, save/delete |
| `useCalendarData.ts` | 🟠 Moyenne | Fetch appointments/unavailabilities, listeners window events |
| `useCustomerPackages.ts` | 🟡 Basse | Fetch forfaits, reset sur changement client/service |
| `useOrganizationSettings.ts` | 🟡 Basse | Cache partagé, `resetOrganizationSettingsCache()` déjà exportée |

### Services partiellement couverts

| Service | Manquant |
|---|---|
| `analytics.service.ts` | Cas avec 0 RDV, période `week`, `month`, TVA collectée |
| `dashboard.service.ts` | Filtre `services` vs `products`, pagination, `getDashboardDetails` |
| `customers.service.ts` | **Zéro test** — recherche, création, unicité téléphone |
| `password.service.ts` | **Zéro test** — hashage, vérification, token expiration |

### E2E Playwright

| Test | État |
|---|---|
| `tests/e2e/billing-accuracy.spec.ts` | ✅ Existe — **mais ne tourne pas en CI** (Playwright non installé) |
| `test/e2e/stats.dashboard.e2e.spec.ts` | `describe.skip` — **désactivé** (dépend de SQLite dev.db) |
| Parcours création RDV complet (UI) | ❌ Absent |
| Parcours encaissement complet | ❌ Absent |
| Parcours indisponibilité (création + suppression série) | ❌ Absent |
| Isolation multi-org (login org A, voir org B) | ❌ Absent |

---

## 🟡 Zones partiellement couvertes

| Fichier | Couvert | Manquant |
|---|---|---|
| `CreateAppointmentSchema` | Rejet organizationId | Validation start < end, duration > 0, CUID serviceId |
| `CustomerPicker` UI | 8 cas utilisateur | Comportement offline, erreurs réseau |
| `dashboard.service getDashboardForOrg` | Agrégation basique | Filtres all/services/products, détails paginés |

---

## 🎯 Plan d'action — Priorités

### 🔴 Sprint 1 — Haute valeur, effort moyen (7 tests)
```
test/api/appointments.route.spec.ts
  ✦ POST — création valide + scoped organisationId
  ✦ POST — conflit 409 collision horaire
  ✦ DELETE — rejet si RDV payé (status=PAID)
  ✦ DELETE — IDOR : suppression RDV autre organisation → 404

test/api/unavailability.route.spec.ts
  ✦ DELETE occurrence seule vs deleteAll (série)
  ✦ DELETE IDOR — suppression autre organisation → 404
  ✦ POST — récurrence WEEKLY génère N occurrences
```

### 🟠 Sprint 2 — Couverture hooks (4 tests)
```
test/hooks/useOrganizationSettings.spec.ts
  ✦ Cache partagé — 1 seul fetch même avec 3 instances
  ✦ resetOrganizationSettingsCache() vide bien le cache

test/hooks/useCustomerPackages.spec.ts
  ✦ Reset sur changement de serviceId
  ✦ Validation Zod sur réponse API corrompue
```

### 🟡 Sprint 3 — E2E Playwright (3 scénarios)
```
tests/e2e/appointment-create.spec.ts
  ✦ Créer RDV → vérifier dans l'agenda → supprimer

tests/e2e/checkout-flow.spec.ts
  ✦ Encaisser un RDV → vérifier dans dashboard

tests/e2e/unavailability.spec.ts
  ✦ Créer indisponibilité récurrente → naviguer semaines → supprimer série
```

---

## 📈 Métriques actuelles vs cibles

```
Unitaires services   ████████░░░░░░░░  50%  → cible 80%
Unitaires lib/utils  ████████████████ 100%  → ✅
Routes API           ██░░░░░░░░░░░░░░  15%  → cible 70%
Hooks                ░░░░░░░░░░░░░░░░   0%  → cible 60%
Composants UI        ████░░░░░░░░░░░░  25%  → cible 50%
E2E Playwright       █░░░░░░░░░░░░░░░  10%  → cible 40%
```

---

## 🔑 Quick Wins immédiats (< 1h total)

1. **`useOrganizationSettings` + `resetOrganizationSettingsCache`** — le hook exporte déjà `resetOrganizationSettingsCache()` exactement pour les tests. 20 minutes.
2. **`DELETE /api/appointments` IDOR** — le test le plus à valeur : vérifie que `deleteMany` with `organizationId` empêche bien la suppression cross-org. 30 minutes.
3. **`CreateAppointmentSchema`** — étendre le test existant : start > end, duration=0. 15 minutes.

