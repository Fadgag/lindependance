# Documentation

Ce dossier centralise la documentation fonctionnelle, technique et opérationnelle du projet
**Indépendance** (application de gestion pour salons / instituts : agenda, clients, forfaits,
encaissement, dashboard de performance).

## Sommaire

- [`fonctionnel.md`](./fonctionnel.md) — Ce que fait l'application, pour qui, les règles métier
  principales (rendez-vous, encaissement/TVA, forfaits clients, isolation multi-organisation).
- [`technique.md`](./technique.md) — Stack, structure du code (`src/app`, `src/domain`,
  `src/services`, `src/lib`...), modèle de données (Prisma), authentification, conventions
  d'architecture (DDD léger), tests.
- [`deploiement.md`](./deploiement.md) — Variables d'environnement, installation locale,
  migrations Prisma, build/démarrage, déploiement (Vercel), scripts d'administration.
- [`migrations-manuelles.md`](./migrations-manuelles.md) — Procédure de vérification et
  d'application manuelle des migrations Prisma sur Neon, sans secrets GitHub Actions.
- [`api-routes.md`](./api-routes.md) — Détail de chaque route API (`src/app/api/`) : méthode,
  entrées/sorties, règles de sécurité, codes d'erreur.
- [`composants-cles.md`](./composants-cles.md) — Détail des composants React les plus
  significatifs (calendrier, encaissement, dashboard, paramètres, UI transverse) et des hooks
  associés.

## Ce que cette documentation **ne couvre pas encore**

- Le contenu détaillé de `specs/features/*.md` et `specs/infrastructure/*.md` (backlog produit,
  spécifications par fonctionnalité) — ces fichiers restent la source de vérité pour le
  roadmap et ne sont que référencés depuis `fonctionnel.md`.
- Les diagrammes d'architecture (flux de données, séquence) — description textuelle uniquement
  à ce stade.
- La documentation exhaustive des ~36 composants et des schémas Zod de `src/schemas/` (seuls
  les plus représentatifs sont couverts).

## À jour au

Dernière mise à jour : documentation des routes API et des composants clés. Voir l'historique
Git pour le détail des évolutions.
