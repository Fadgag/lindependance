# Guide de déploiement

## 1. Prérequis

- **Node.js** (version compatible Next.js 15+/React 19, cf. `package.json`) et **pnpm**
  (`.npmrc` : `package-manager=pnpm@latest`).
- Une base **PostgreSQL** accessible (recommandé : [Neon](https://neon.tech), pooler activé).
- Un secret `NEXTAUTH_SECRET` (obligatoire en production/CI — le build échoue sinon, voir §3).

## 2. Installation locale

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les valeurs (voir §3)
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # ou `migrate dev` si tu ajoutes une nouvelle migration
pnpm seed                          # optionnel : jeu de données de démo
pnpm dev
```

L'application est alors disponible sur `http://localhost:3000`.

Pour créer un premier compte administrateur sans passer par le seed :

```bash
pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-admin.ts
```
(modifier au préalable les valeurs `CONFIG` en tête du script : email, mot de passe, nom
d'organisation.)

## 3. Variables d'environnement

Voir `.env.example` pour le détail. Résumé :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Connexion PostgreSQL (utiliser l'URL du **pooler** en production) |
| `DIRECT_URL` | oui (Prisma) | Connexion directe (hors pooler) utilisée par les migrations Prisma |
| `SHADOW_DATABASE_URL` | non | Requis seulement si tu utilises un Shadow DB pour `prisma migrate dev` |
| `NEXTAUTH_SECRET` | **oui en production/CI** | Secret de signature des sessions Auth.js. Génère-le avec `openssl rand -hex 32`. Le build (`pnpm run prebuild` → `check-env`) échoue si absent en production/CI. |
| `RESEND_API_KEY` | non | Envoi d'emails (ex. réinitialisation de mot de passe) via Resend, si utilisé |
| `NEXT_PROXY_INJECTION_MODE` | non (défaut `A`) | Stratégie d'injection du header `x-org-id` par le proxy (`A` ou `B` — voir `README.md`) |

⚠️ Ne jamais committer `.env.local` (déjà exclu par `.gitignore`). Ne jamais committer de
secret réel dans `.env.example`.

## 4. Migrations de base de données

```bash
# Appliquer les migrations en attente sur la base ciblée
pnpm exec prisma migrate deploy

# Créer une nouvelle migration en local après modification de prisma/schema.prisma
pnpm exec prisma migrate dev --name <description_courte>
```

Pour appliquer une migration manuellement sur Neon, suivre la procédure détaillée dans
[`migrations-manuelles.md`](./migrations-manuelles.md). Ne pas utiliser `migrate dev`
sur une base partagée ou de production.

Scripts pratiques déjà fournis dans `package.json` :
```bash
pnpm run migrate:local   # utilise DATABASE_URL et DIRECT_URL fournis par l'environnement
pnpm run seed:local      # prisma db seed sur une DB Postgres locale
```
Pour les migrations Prisma, fournir explicitement ces deux variables dans l'environnement
local (ou le fichier `.env` chargé par Prisma) ; le script ne choisit plus une base ou un
utilisateur propres à un poste.

Des scripts de maintenance ponctuels existent dans `prisma/scripts/` et `scripts/`
(ex. `scripts/backfill_soldProducts.ts`, `prisma/scripts/backfill_appointment_price.ts`) —
à exécuter au cas par cas lors de migrations de données, jamais automatiquement.

## 5. Build et démarrage (production)

```bash
pnpm run build   # exécute check-env + prisma generate + next build
pnpm run start   # exécute check-env puis next start
```

`pnpm run build` échoue volontairement si `NEXTAUTH_SECRET` n'est pas défini quand
`NODE_ENV=production` ou `CI=true` (voir `scripts/check-nextauth-secret.js`).

## 6. Déploiement sur Vercel (recommandé)

Le projet est un Next.js standard, déployable directement sur
[Vercel](https://vercel.com/new) :

1. Importer le dépôt GitHub dans Vercel.
2. Renseigner les variables d'environnement (§3) dans les paramètres du projet Vercel
   (Production **et** Preview si les previews doivent aussi fonctionner).
3. S'assurer que `DATABASE_URL` pointe vers l'URL **pooler** de Neon (compatible avec les
   fonctions serverless de Vercel) et `DIRECT_URL` vers l'URL directe (utilisée par Prisma
   pour les migrations).
4. Le build Vercel et la CI ne lancent pas les migrations Prisma. Elles doivent être
   vérifiées et appliquées manuellement par un opérateur, selon
   [`migrations-manuelles.md`](./migrations-manuelles.md), avant de tester ou promouvoir
   un changement de schéma.
5. Le build Vercel exécute `pnpm run build` (donc `check-env` + `prisma generate` + `next build`
   — cf. §5) : le déploiement échoue proprement si `NEXTAUTH_SECRET` manque.

### CI/CD trunk-based

Le flux utilise `main` comme branche de production et `preprod` comme branche
de validation permanente. Les branches de fonctionnalité ouvrent une PR vers
`preprod`. Le workflow GitHub Actions `CI` exécute ESLint sur les fichiers
JavaScript/TypeScript modifiés, vérification TypeScript, tests Vitest et build
sur les PR vers `preprod` ou `main`, ainsi que sur les pushes vers ces branches.
Le lint est limité aux fichiers modifiés pour éviter que les erreurs
préexistantes ailleurs dans le dépôt bloquent une PR.

Le projet Vercel conserve `main` comme branche **Production**. L’environnement
Vercel **Preview** suit la branche `preprod` et son domaine stable
`https://lindependance-testing.vercel.app`. Une PR vers `preprod` obtient aussi
son propre déploiement Preview ; après validation, sa fusion dans `preprod`
actualise le domaine stable. Les variables `DATABASE_URL`, `DIRECT_URL`,
`NEXTAUTH_SECRET` et `AUTH_SECRET` de Preview doivent rester distinctes de celles
de Production. Pour le domaine stable, `NEXTAUTH_URL` Preview doit être
configurée spécifiquement pour la branche `preprod` ; aucune URL Preview ne doit
rediriger vers le domaine Production.

Une fois la préprod validée, une PR de `preprod` vers `main` constitue la
promotion. Le workflow **Main promotion source** échoue si une PR vers `main`
ne provient pas de la branche `preprod` du même dépôt. Après fusion, Vercel
déploie `main` en Production. Ne pas utiliser le workflow manuel historique
**Promote Preview to Production** pour cette stratégie.

Dans **GitHub → Settings → Rules / Branch protection**, protéger `main` en
exigeant une PR, en interdisant les pushes directs et en exigeant les contrôles
`CI / Validate Prisma migrations`, `CI / Lint, typecheck, test, and build` et
`Main promotion source / Only preprod may target main`. Ne pas autoriser le
bypass administrateur si la règle doit s’appliquer à tous les contributeurs.
Les règles de `preprod` devraient également exiger les contrôles de migration et de qualité
avant fusion.

GitHub Actions n'applique les migrations que sur sa base PostgreSQL éphémère : aucun
secret de base de données partagé n'est nécessaire dans GitHub. La CI lance
`pnpm run check:migrations`, qui applique les règles statiques du dépôt, puis applique
l'historique Prisma sur une base vide et vérifie son statut. Cela ne remplace ni la revue
du SQL, ni la sauvegarde, ni la vérification de la cible avant l'exécution manuelle sur
Neon.

## 7. Déploiement sur un autre hébergeur (Node.js générique)

```bash
pnpm install --frozen-lockfile
pnpm run build
# appliquer manuellement les migrations après sauvegarde et vérification de la base cible
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm run start                     # démarre next start (par défaut sur le port 3000)
```

Configurer un process manager (systemd, PM2, ou équivalent) pour superviser `pnpm run start`,
et exposer le port via un reverse proxy (nginx/Caddy) en HTTPS.

## 8. Checklist avant mise en production

- [ ] `NEXTAUTH_SECRET` généré et défini (valeur différente de dev/preview/prod).
- [ ] `DATABASE_URL` / `DIRECT_URL` pointent vers la base de production (pas la base de dev).
- [ ] Migrations Prisma vérifiées et appliquées manuellement (`prisma migrate deploy`)
      sur la base cible, après sauvegarde.
- [ ] `pnpm run build` passe sans erreur en local avec les mêmes variables d'environnement.
- [ ] `npx vitest run` passe (non-régression) avant de merger sur la branche de déploiement.
- [ ] Au moins un compte administrateur existe (seed ou `scripts/create-admin.ts`).
