# Documentation fonctionnelle

## 1. Objectif de l'application

**Indépendance** est une application de gestion à destination de professionnels indépendants
ou de petites structures (salons de coiffure, instituts de beauté, praticiens...). Elle couvre
le cycle courant d'activité :

- **Agenda** : planification des rendez-vous par membre du staff.
- **Clients** : fiche client, historique, forfaits de séances.
- **Catalogue** : services (prestations) et produits vendus en boutique.
- **Encaissement** : clôture d'un rendez-vous, ajout d'extras et de produits, calcul du total
  et de la TVA, paiement.
- **Dashboard** : chiffre d'affaires réalisé/prévisionnel, nombre de rendez-vous, nouveaux
  clients, TVA collectée, sur des périodes glissantes (jour / semaine / mois / 30 jours).
- **Paramètres d'organisation** : horaires d'ouverture, objectif de CA journalier, gestion des
  services, produits, staff.

## 2. Multi-organisation

Chaque compte utilisateur (`User`) est rattaché à une `Organization`. Toutes les données
métier (rendez-vous, clients, services, produits, forfaits, indisponibilités) sont scopées par
`organizationId` : une organisation ne voit et ne modifie jamais les données d'une autre
(garde appliquée systématiquement côté API — voir `documentation/technique.md`).

## 3. Rendez-vous (Agenda)

- Un rendez-vous (`Appointment`) est associé à un service, un client, éventuellement un membre
  du staff, un créneau horaire (début/fin) et un statut (`CONFIRMED`, `PAID`, `CANCELLED`, ou
  legacy `PAYED`).
- **Conflit horaire** : à la modification d'un rendez-vous, le système refuse par défaut de
  déplacer un rendez-vous sur un créneau qui chevauche un autre rendez-vous du même membre du
  staff (chevauchement strict — deux rendez-vous qui se touchent exactement aux bornes, ex.
  10h-11h et 11h-12h, ne sont pas en conflit). L'utilisateur peut forcer le déplacement
  (paramètre `force`).
- **Suppression** : un rendez-vous marqué payé (`PAID`/`PAYED`, ou disposant d'un `finalPrice`
  positif) ne peut jamais être supprimé, quelle que soit l'origine de la demande (agenda,
  écran d'encaissement, appel API direct).
- **Indisponibilités** (`Unavailability`) : congés ou blocages personnels du staff, avec
  récurrence possible (aucune, hebdomadaire, bimensuelle, mensuelle). Ne sont jamais comptées
  dans le chiffre d'affaires.

## 4. Forfaits clients (crédit de séances)

- Un client peut acheter un **forfait** (`Package` → `CustomerPackage`) donnant droit à un
  nombre de séances (`totalSessions` / `sessionsRemaining`), avec une date d'expiration
  optionnelle.
- Un forfait n'est **utilisable** que s'il reste au moins une séance disponible
  (`sessionsRemaining > 0`) et, s'il a une date d'expiration, que celle-ci n'est pas dépassée.
- Réserver un rendez-vous en utilisant un forfait décrémente automatiquement et de façon
  atomique le compteur de séances restantes (protection contre la double consommation en cas
  de requêtes concurrentes).

## 5. Encaissement (Checkout)

- Depuis l'agenda ou le dashboard, un gérant peut clôturer un rendez-vous : ajuster le prix de
  base avec des **extras** (libellé + prix libre) et des **produits vendus** (issus du
  catalogue produits, avec quantité).
- Chaque produit vendu porte un prix TTC et un taux de TVA ; le montant de TVA inclus dans le
  prix TTC est calculé automatiquement (formule : `TTC − TTC / (1 + taux/100)`), arrondi au
  centime.
- Le rendez-vous est ensuite marqué `PAID`, avec le mode de paiement choisi (CB, espèces,
  chèque) et une note libre éventuelle.
- **Portée volontairement limitée** : pas de génération de facture PDF légale ni de
  comptabilité réglementaire — l'objectif est un suivi interne du CA et de la TVA collectée,
  à donner en fin de mois au comptable externe si besoin (voir `specs/backlog.md`).

## 6. Dashboard de performance

- **CA réalisé** : somme des montants des rendez-vous marqués payés sur la période.
- **CA prévisionnel** : somme des montants de tous les rendez-vous non annulés sur la période
  (payés ou non), utile pour anticiper l'activité à venir.
- Répartition **prestations / produits**, TVA collectée sur les produits, nombre de rendez-vous,
  nombre de nouveaux clients, nombre de staff actifs.
- Périodes disponibles : aujourd'hui, semaine en cours, mois en cours, 30 jours glissants, ou
  une plage personnalisée.

## 7. Rôles et accès

- Authentification par email/mot de passe (Auth.js / NextAuth), avec réinitialisation de mot
  de passe par email (token à durée de vie limitée).
- Un rôle (`role` sur `User`) permet de distinguer les niveaux d'accès (voir
  `src/components/RoleGuard.tsx` pour la logique de garde côté UI).

## 8. Roadmap fonctionnelle

Le backlog produit détaillé (fonctionnalités à venir, dette technique fonctionnelle) est tenu
dans [`specs/backlog.md`](../specs/backlog.md) ; les spécifications détaillées par fonctionnalité
sont dans [`specs/features/`](../specs/features/).
