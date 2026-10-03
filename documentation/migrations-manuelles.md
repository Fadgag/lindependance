# Migrations Prisma manuelles sur Neon

Cette procédure s'applique aux bases partagées Neon, notamment `preprod` et `production`.
La CI vérifie les migrations sur une base PostgreSQL éphémère, mais ne touche pas aux
bases partagées. Vercel ne lance pas les migrations : un opérateur vérifie la cible et les
applique manuellement. Ne crée pas de secrets de base de données GitHub Actions pour cette
procédure.

## Contrôles automatiques en CI

Chaque PR et push couvert par le workflow `CI` exécute `pnpm run check:migrations`, puis
applique toute l'historique Prisma sur une base PostgreSQL 16 neuve et vérifie son statut.
Ces contrôles détectent une migration SQL interdite par le garde-fou du dépôt ou un
historique qui ne s'applique pas depuis une base vide. Ils ne vérifient ni une base Neon
partagée, ni la sauvegarde, ni le comportement des données réelles.

Les scripts de backfill et autres migrations de données restent séparés de l'historique
automatique Prisma. Ils nécessitent une procédure dédiée, relançable sans effet indésirable,
et une vérification opérateur avant exécution sur une base partagée.

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

Pour la préproduction, si
`20260930000000_customer_portal_phase_1` a été appliquée mais pas l'archivage staff, la
migration attendue est `20260930232000_staff_archiving`. Si la Phase 3 du portail client
est déjà appliquée, la migration de campagnes de recette attendue est
`20261002120000_test_feedback_campaigns`. Vérifier le contenu de chaque migration en
attente avant de l'exécuter :

```bash
cat prisma/migrations/20260930232000_staff_archiving/migration.sql
cat prisma/migrations/20261002120000_test_feedback_campaigns/migration.sql
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

La fonctionnalité de campagnes de recette ajoute `TestCampaign` et `TestFeedback` par la
migration `prisma/migrations/20261002120000_test_feedback_campaigns/migration.sql`. Elle
ajoute les tables, index et clés étrangères sans modifier les rendez-vous ni les données
existantes. Après application, vérifier la présence des deux tables dans la base cible :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('TestCampaign', 'TestFeedback')
ORDER BY table_name;
```

La sélection de parcours des campagnes est ajoutée par
`prisma/migrations/20261003010000_test_campaign_scenario_groups/migration.sql`. Cette
migration ajoute le champ `TestCampaign.scenarioGroups` avec un tableau vide par défaut et
autorise l'absence de valeur dans l'ancien champ `build`. Elle ne supprime ni ne réécrit
les campagnes existantes ; l'application interprète les groupes vides des anciennes
campagnes comme l'ensemble des scénarios correspondant à leurs profils.

## À ne pas faire

- Ne jamais lancer `prisma migrate reset`, `prisma db push`, `prisma migrate dev` ou un seed
  sur une base partagée ou de production.
- Ne pas utiliser `prisma migrate resolve` pour contourner une erreur sans avoir d'abord
  identifié la cause et vérifié l'état réel de la base.
- Ne pas poursuivre si la cible, les migrations en attente ou le contenu SQL diffèrent de
  ce qui était prévu.
- Ne pas supposer que le déploiement Vercel applique les migrations : vérifier d'abord leur
  état puis appliquer cette procédure manuelle avant de tester l'application.
