# `src/domain/`

Couche métier pure : règles et calculs, sans dépendance à Next.js (`Request`/`NextResponse`),
sans dépendance directe à Prisma, sans React. Objectif : testable en unitaire (Vitest) sans
lancer l'application ni mocker la base de données.

## Convention

- `src/app/api/**/route.ts` : auth, parsing (Zod), orchestration HTTP. Ne contient **aucune**
  règle métier conditionnelle (`if` métier) — délègue à `src/domain/`.
- `src/domain/<sous-domaine>/` : fonctions pures (règles, policies, calculs). Prend des données
  en entrée (objets/valeurs simples), retourne un résultat ou lève une erreur métier typée.
- `src/services/` : reste la couche de persistance (accès Prisma), appelée après validation
  par le domaine.

## Sous-domaines prévus (créés au fil des phases du plan DDD)

- `billing/` — calcul TVA, lignes de vente produits (Phase 1)
- `appointment/` — policies de suppression, détection de conflit horaire (Phase 2)
- `package/` — décrément de crédit de séances (Phase 3)

## Test

Chaque module de `src/domain/` a son miroir dans `test/domain/**/*.spec.ts`, sans mock Prisma.
