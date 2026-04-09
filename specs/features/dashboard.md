# 🏗️ Skill: Feature - Dashboard de Performance (V1.0)
**Statut :** DRAFT
**Feature :** Statistiques de revenus et d'activité

## 🎯 Objectif Métier
Permettre aux gérants de voir en un coup d'œil :
- Le Chiffre d'Affaires (CA) total du mois.
- Le nombre de nouveaux clients créés.
- Le taux d'occupation (Rendez-vous vs Capacité).

## 🛠️ Stack & Architecture Imposée
1. **Data Layer (Prisma) :**
    - Calculer la somme de `price` dans la table `Appointment` où `status = 'COMPLETED'`.
    - Compter les `Customer` créés sur les 30 derniers jours.
2. **Logic Layer (Services) :**
    - Créer `src/services/analytics.service.ts`.
    - Méthode `getOrgStats(orgId: string, startDate: Date, endDate: Date)`.
3. **API Layer :**
    - Route : `GET /api/stats`.
    - **Protection :** Extraire `organizationId` de la session. Interdiction de passer l'ID en paramètre Query (Sécurité).

## 🛡️ Règles de Sécurité (Anti-IDOR)
- [ ] OBLIGATOIRE : `where: { organizationId: session.orgId }` sur toutes les agrégations.
- [ ] OBLIGATOIRE : Validation des dates via Zod.

## 🧪 Protocole de Test (TDD)
- **Unit (Vitest) :** `analytics.service.ts` doit retourner 0 si l'organisation n'a aucune donnée, et non une erreur.
- **E2E (Playwright) :** Se connecter avec l'Org "Test A", vérifier que les chiffres affichés correspondent à ses propres data et non à "Test B".

## 🎨 UI Design
- Utiliser `Card` de Shadcn/UI pour les KPI.
- Utiliser un `BarChart` de Recharts pour les revenus par jour.