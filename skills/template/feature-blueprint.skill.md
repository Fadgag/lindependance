# 🏗️ Skill: Feature Blueprint (Template)
**Statut :** [DRAFT / VALIDATED]
**Feature :** [Nom de la fonctionnalité]

## 🎯 Objectif Métier
Expliquer ici CE QUE la feature doit faire pour l'utilisateur final.

## 🛠️ Stack & Architecture Imposée
1. **Schema Prisma :** - [ ] Ajouter table `X` ou champ `Y`.
    - [ ] Relation obligatoire avec `Organization`.
2. **Logic Layer (Services) :**
    - Créer `src/services/[name].service.ts`.
    - Toute la logique Prisma doit être ICI, pas dans la route API.
3. **API Layer (Next.js App Router) :**
    - Route : `src/app/api/[path]/route.ts`.
    - Protection : Utiliser `getSessionFromRequest`.
4. **UI Layer :**
    - Composants : [Shadcn / Lucide Icons / Tailwind].

## 🛡️ Règles de Sécurité (Anti-IDOR)
- [ ] Le `organizationId` doit être injecté de force dans chaque requête.
- [ ] Vérifier les permissions : [Admin seul / Staff / Client].

## 🧪 Protocole de Test (Definition of Done)
- **Test Unitaire :** Le service `X` renvoie bien les données filtrées.
- **Test de Sécurité :** Une session `Org_A` reçoit une erreur 403 en tentant d'accéder aux données `Org_B`.