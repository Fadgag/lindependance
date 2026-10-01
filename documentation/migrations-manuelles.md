# Migrations Prisma manuelles sur Neon

Cette procédure s'applique aux bases partagées Neon, notamment `preprod` et `production`.
La CI et Vercel ne lancent pas les migrations : un opérateur vérifie la cible et applique
les migrations manuellement. Ne crée pas de secrets de base de données GitHub Actions pour
cette procédure.

## Avant de commencer

- Vérifier que la branche cible contient le changement fusionné et que le dépôt est propre.
- Faire une sauvegarde ou créer une branche Neon de sauvegarde de la base cible, si cette
  fonctionnalité est disponible.
- Renseigner localement `DATABASE_URL` et `DIRECT_URL` dans le fichier `.env` non commité.
  Ne jamais coller ces valeurs dans un terminal partagé, un ticket, un chat ou un fichier
  suivi par Git.
- Dans la console Neon, vérifier le projet, la branche et la base visés. Vérifier que
  l'environnement est bien `preprod` avant une migration de préproduction et
  `production` avant une migration de production.
- Pour la production, planifier l'opération, confirmer la sauvegarde et obtenir
  l'autorisation opérationnelle requise avant de continuer.

## Vérifier les migrations en attente

Depuis la racine du dépôt :

```bash
pnpm exec prisma migrate status
```

Cette commande indique les migrations déjà appliquées et celles qui restent à appliquer.
Si la liste des migrations en attente est inattendue, si la base affichée n'est pas la
bonne, ou si Prisma signale une migration en échec, arrêter ici et diagnostiquer avant
toute autre commande.

Pour la préproduction actuelle, si
`20260930000000_customer_portal_phase_1` a déjà été appliquée, la migration attendue est
`20260930232000_staff_archiving`. Vérifier le contenu avant de l'exécuter :

```bash
cat prisma/migrations/20260930232000_staff_archiving/migration.sql
```

Cette migration ajoute uniquement `Staff.active BOOLEAN NOT NULL DEFAULT true`. La nouvelle
colonne reçoit la valeur `true` par défaut pour les praticiens déjà présents ; les colonnes
existantes et les rendez-vous ne sont pas mis à jour ou supprimés.

Un contrôle statique supplémentaire peut être lancé avant l'application :

```bash
node scripts/check-additive-migrations.mjs
```

Ce contrôle porte sur les fichiers SQL de migration du dépôt. Il complète la revue
manuelle, mais ne vérifie ni l'identité de la base cible ni la sauvegarde.

## Appliquer et vérifier

Uniquement après avoir confirmé la cible, la sauvegarde et le SQL en attente :

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

La seconde commande doit indiquer que le schéma est à jour. Pour vérifier la colonne
ajoutée, exécuter dans l'éditeur SQL Neon de la base cible :

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Staff'
  AND column_name = 'active';
```

Le résultat attendu est une colonne booléenne `active`, non nullable, avec le défaut
`true`. La phase 1 du portail client ajoute aussi les tables `CustomerEmailOtp` et
`CustomerPortalRateLimitEvent` ; si cette migration est déjà appliquée, ces tables doivent
être présentes.

La Phase 3 du portail client ajoute `AppointmentChangeRequest`. Avant l'application,
vérifier le SQL de `prisma/migrations/20261001120000_customer_portal_phase_3/migration.sql`.
Cette migration conserve les demandes historiques en détachant leur rendez-vous supprimé,
et crée un index unique partiel empêchant plusieurs demandes `PENDING` pour le même
rendez-vous.

## À ne pas faire

- Ne jamais lancer `prisma migrate reset`, `prisma db push`, `prisma migrate dev` ou un seed
  sur une base partagée ou de production.
- Ne pas utiliser `prisma migrate resolve` pour contourner une erreur sans avoir d'abord
  identifié la cause et vérifié l'état réel de la base.
- Ne pas poursuivre si la cible, les migrations en attente ou le contenu SQL diffèrent de
  ce qui était prévu.
- Ne pas supposer que le déploiement Vercel applique les migrations : vérifier d'abord leur
  état puis appliquer cette procédure manuelle avant de tester l'application.
