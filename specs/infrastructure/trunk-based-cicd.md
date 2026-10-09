# Spec : CI/CD trunk-based vers Vercel (offre gratuite)

## Objectif

Utiliser `preprod` comme branche permanente de validation et `main` comme
branche de production. Seule une PR issue de `preprod` peut être fusionnée dans
`main`; les pushes directs sur `main` sont interdits.

## Flux cible

1. Les branches de fonctionnalité ouvrent une PR vers `preprod`.
2. GitHub Actions exécute ESLint sur les fichiers JavaScript/TypeScript modifiés,
   TypeScript, Vitest, le build et la validation des migrations Prisma pour les PR vers
   `preprod` et `main`. La validation des migrations utilise PostgreSQL éphémère.
3. Vercel génère un Preview éphémère pour chaque PR. Après validation, fusionner
   la PR dans `preprod` ; Vercel déploie alors cette branche sur le domaine
   Preview stable `https://lindependance-testing.vercel.app`.
4. Après validation fonctionnelle de `preprod`, ouvrir une PR de `preprod` vers
   `main`. Un contrôle GitHub Actions dédié échoue pour toute autre branche
   source. `main` exige également le succès de la CI.
5. Après fusion de `preprod` dans `main`, Vercel déploie `main` en Production.

## Environnements et sécurité

- `main` reste la branche Production du projet Vercel ; `preprod` est une
  branche suivie par l’environnement standard Preview, compatible avec l’offre
  gratuite.
- Le domaine Preview stable est associé à la branche `preprod`, pas à chaque
  branche de fonctionnalité.
- `DATABASE_URL` et `DIRECT_URL` Preview pointent vers une base Neon de test
  séparée de Production. Les secrets Auth Preview sont distincts des secrets
  Production. `NEXTAUTH_URL` Preview est un override limité à `preprod` et
  pointe vers le domaine Preview stable.
- Le contrôle de source de PR vers `main` autorise uniquement une branche
  `preprod` du même dépôt. La protection de `main` exige une PR et ce contrôle,
  afin de bloquer les pushes directs et les PR depuis d’autres branches.
- Les migrations Prisma restent manuelles et doivent cibler explicitement la
  base de l’environnement concerné.
- La CI vérifie les règles statiques des migrations et applique l'historique complet sur
  une base PostgreSQL éphémère ; elle n'accède pas aux bases partagées et ne les modifie pas.

## Hors périmètre

- Création de bases PostgreSQL, domaines ou secrets dans les comptes Vercel,
  GitHub ou du fournisseur PostgreSQL.
- Exécution automatique des migrations en production.
- Push, merge ou modification distante des paramètres GitHub/Vercel sans
  autorisation explicite.

## Critères d’acceptation

- Les PR vers `preprod` et `main` passent les contrôles de qualité CI.
- Les migrations s'appliquent sur une base PostgreSQL vide dans la CI, sans secret partagé.
- Une PR vers `main` depuis une branche autre que `preprod` échoue au contrôle
  `Main promotion source / Only preprod may target main`.
- Les pushes directs et les merges sans PR vers `main` sont bloqués.
- La fusion dans `preprod` actualise le domaine Preview stable sans modifier le
  domaine Production.
- Seule la fusion d’une PR `preprod` vers `main` publie les changements en
  Production.
- La documentation ne contient aucun secret réel.
