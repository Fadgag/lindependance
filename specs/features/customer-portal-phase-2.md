# 🏗️ Feature Blueprint — Portail client, Phase 2
**Statut :** IMPLEMENTED
**Feature :** Mes rendez-vous et annulation client

> Dépend de la [Phase 1 — Réservation](customer-portal-phase-1.md) et des
> règles communes dans [`customer-portal.md`](customer-portal.md).

## 🎯 Objectif
Permettre au client authentifié de retrouver les rendez-vous futurs des fiches
associées à son email vérifié et d'annuler en ligne les rendez-vous admissibles.

## Scope
- Page `/portail/[organizationSlug]/mes-rdv`.
- `GET /api/portail/rdv?organizationSlug=<slug>` vérifie que le slug demandé
  correspond à l'organisation active de la session OTP avant de résoudre en
  base les fiches par `(session.organizationId, session.verifiedEmail)`. Un
  décalage entre le slug et la session retourne `404` sans lancer la recherche
  de rendez-vous. La réponse est privée et non mise en cache.
- La page « Mes rendez-vous » transmet son slug courant et ne conserve pas la
  liste d'une autre organisation lors d'une navigation entre salons.
- Afficher pour chaque rendez-vous le membre de la famille concerné, la
  prestation, le praticien, la date/heure dans le fuseau de l'organisation et
  le statut.
- `DELETE /api/portail/rdv/[id]` vérifie que le rendez-vous appartient à une
  fiche liée à l'email et à l'organisation de la session. Le client ne peut
  jamais élargir son accès en envoyant un autre `customerId`.
- Annulation directe seulement si le rendez-vous n'est pas payé et se situe
  à plus de 24 heures. Les statuts `PAID` et `PAYED`, ainsi qu'un `finalPrice`
  positif, rendent l'annulation en ligne indisponible quelle que soit la date.
  À 24 heures ou moins, l'API refuse aussi l'action et l'interface invite à
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
   fiche non associée. Le slug demandé correspond à l'organisation de la
   session OTP.
2. Les rendez-vous sont ordonnés chronologiquement et distinguent chaque
   membre de la famille.
3. Seul un rendez-vous non payé situé à plus de 24h peut être annulé en ligne.
   Les rendez-vous payés (`PAID`, `PAYED` ou `finalPrice` positif) et ceux à
   24h ou moins sont refusés côté API, même si la requête est forgée.
4. Une annulation sur un forfait recrédite une séance une seule fois ;
   l'absence de forfait ou une annulation refusée ne modifie pas les crédits.
5. Un client ne peut pas annuler un rendez-vous d'une autre organisation ou
   d'une fiche non reliée à son email vérifié.
6. Une session de l'organisation A ne reçoit et n'affiche aucun rendez-vous
   d'A sous le portail de l'organisation B, y compris après navigation et
   rechargement ; le client doit s'identifier auprès de B pour consulter ses
   rendez-vous.
