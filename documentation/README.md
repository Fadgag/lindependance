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

## À jour au

Dernière mise à jour : Phase 3 du plan DDD (`src/domain/billing`, `src/domain/appointment`,
`src/domain/package`). Voir l'historique Git pour le détail des évolutions.
