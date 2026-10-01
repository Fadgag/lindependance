# 🏗️ Skill: Feature Blueprint (Template)
**Statut :** [DRAFT / VALIDATED]
**Feature :** [Nom de la fonctionnalité]

## 🎯 Objectif Métier
Expliquer ici CE QUE la feature doit faire pour l'utilisateur final.

## 🛠️ Stack & Architecture Imposée
1. **Schema Prisma :** Ajouter une table ou un champ uniquement si nécessaire, avec une relation à `Organization` si la donnée appartient à une organisation.
2. **Domaine :**
    - Créer les fonctions métier pures dans `src/domain/[subdomain]/`.
    - N'importer ni Next.js, ni Prisma, ni React dans le domaine.
3. **Persistance :**
    - Créer `src/services/[name].service.ts` pour les accès Prisma.
    - Les services appliquent le scoping d'organisation après validation métier ; ils ne remplacent pas la logique du domaine.
4. **API Layer (Next.js App Router) :**
    - Route : `src/app/api/[path]/route.ts`.
    - Limiter la route à l'authentification, au parsing/validation Zod et à l'orchestration.
5. **UI Layer :**
    - Composants : [Shadcn / Lucide Icons / Tailwind].

## 🛡️ Règles de Sécurité (Anti-IDOR)
- [ ] Le `organizationId` doit être injecté de force dans chaque requête.
- [ ] Vérifier les permissions : [Admin seul / Staff / Client].

## 🧪 Protocole de Test (Definition of Done)
- **Domaine :** Tester les fonctions pures dans `test/domain/**/*.spec.ts`, sans mock Prisma.
- **Persistance/API :** Vérifier les résultats et l'isolation entre organisations selon le contrat API (403 ou 404 selon le comportement attendu).