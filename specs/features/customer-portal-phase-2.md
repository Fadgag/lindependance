# 🏗️ Feature Blueprint — Portail client, Phase 2
**Statut :** PLANNED
**Feature :** Mes rendez-vous et annulation client

> Dépend de la [Phase 1 — Réservation](customer-portal-phase-1.md) et des
> règles communes dans [`customer-portal.md`](customer-portal.md).

## 🎯 Objectif
Permettre au client authentifié de retrouver les rendez-vous futurs des fiches
associées à son email vérifié et d'annuler en ligne les rendez-vous admissibles.

## Scope
- Page `/portail/[organizationSlug]/mes-rdv`.
- `GET /api/portail/rdv` résout en base les fiches par
  `(session.organizationId, session.verifiedEmail)` et ne retourne que leurs
  rendez-vous futurs non annulés, triés du plus proche au plus lointain.
- Afficher pour chaque rendez-vous le membre de la famille concerné, la
  prestation, le praticien, la date/heure dans le fuseau de l'organisation et
  le statut.
- `DELETE /api/portail/rdv/[id]` vérifie que le rendez-vous appartient à une
  fiche liée à l'email et à l'organisation de la session. Le client ne peut
  jamais élargir son accès en envoyant un autre `customerId`.
- Annulation directe seulement si le rendez-vous est à plus de 24 heures.
  À 24 heures ou moins, l'API refuse l'action et l'interface invite à
  contacter le staff. Le contrôle est toujours serveur et utilise le fuseau
  de l'organisation.
- Passer le statut à `CANCELLED` sans supprimer la ligne.
- Pour un rendez-vous lié à un `CustomerPackage`, recréditer
  `sessionsRemaining` atomiquement uniquement lorsque l'annulation est
  autorisée.

## Hors scope
- Modifier le créneau directement ou soumettre une demande de changement
  (Phase 3).
- Historique complet des rendez-vous passés et demandes RGPD.

## Definition of Done — Phase 2
1. Le client voit les rendez-vous futurs non annulés de toutes les fiches
   associées à son email dans cette organisation, et aucun rendez-vous d'une
   fiche non associée.
2. Les rendez-vous sont ordonnés chronologiquement et distinguent chaque
   membre de la famille.
3. L'annulation à plus de 24h fonctionne ; à 24h ou moins, elle est refusée
   côté API, même si la requête est forgée.
4. Une annulation sur un forfait recrédite une séance une seule fois ;
   l'absence de forfait ou une annulation refusée ne modifie pas les crédits.
5. Un client ne peut pas annuler un rendez-vous d'une autre organisation ou
   d'une fiche non reliée à son email vérifié.
