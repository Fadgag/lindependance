# 🏗️ Feature Blueprint — Portail client, Phase 1
**Statut :** DRAFT
**Feature :** Réservation en ligne (MVP)

> Lire d'abord la spec de référence [`customer-portal.md`](customer-portal.md)
> pour les décisions métier communes. Cette livraison ne réalise que la Phase 1.

## 🎯 Objectif
Permettre à un client dont la fiche est tenue par le staff de réserver en ligne
une prestation, avec un contrôle fiable des créneaux et une confirmation email.
Le MVP est activable par organisation et ne crée pas de compte client autonome.

## Scope

### Organisation et fiches clients
- Ajouter `Organization.slug` (unique, nullable pour compatibilité),
  `portalEnabled` (false par défaut) et `timezone` (défaut `Europe/Paris`).
- Ajouter un email de contact portail nullable et non unique à `Customer`.
  Le staff le gère ; le même email peut être placé sur les fiches de membres
  d'une famille.
- Ajouter l'écran staff `/settings/portail` pour renseigner le slug et activer
  ou désactiver le portail.
- Le portail public résout toute organisation par slug et n'expose jamais
  l'id interne. Slug inconnu ou portail désactivé : 404.

### Identification OTP
- Le visiteur entre le slug de l'organisation et l'email. Si des fiches
  correspondantes existent, envoyer un code OTP via Resend ; la réponse reste
  identique si aucune fiche n'existe.
- OTP numérique, usage unique, stocké hashé/HMAC, expiration 10 minutes,
  maximum 5 essais ; renvoi invalide le précédent.
- Rate limit distribué : 3 envois par email/15 min, 10 demandes par IP/heure.
- Après vérification, session distincte du staff, limitée à
  `accountType=CUSTOMER`, l'organisation résolue et l'email vérifié. Ne pas
  créer de `User` ou `CustomerAccount`.
- Aucune inscription publique. L'email sans fiche ne peut pas réserver.
- Les identifiants d'organisation ne viennent jamais du navigateur ; toutes les
  requêtes sur les fiches re-résolvent le groupe `(organizationId, email)`.

### Parcours de réservation
- Page `/portail/[organizationSlug]/reserver` :
  1. Choisir une prestation proposée par l'organisation.
  2. Si l'email OTP est lié à plusieurs fiches, choisir « Pour qui est le
     rendez-vous ? » ; si une seule fiche correspond, la sélectionner
     automatiquement.
  3. Choisir un praticien si l'organisation en a plusieurs ; masquer le
     sélecteur si elle n'en a qu'un. Tous les praticiens peuvent réaliser
     toutes les prestations en Phase 1.
  4. Choisir un créneau et s'authentifier par OTP si nécessaire.
  5. Confirmer la réservation.
- Le serveur charge la prestation et utilise sa durée et son prix depuis la
  base. Il calcule l'heure de fin ; les valeurs envoyées par le navigateur ne
  font pas autorité.
- Les heures d'ouverture/fermeture actuelles s'appliquent tous les jours.
  Les rendez-vous actifs bloquent le praticien ; les indisponibilités
  `Unavailability` sont globales et bloquent tous les praticiens.
- Vue agenda publique en lecture seule :
  `/portail/[organizationSlug]/agenda`, avec blocs occupés anonymisés
  (« Réservé ») et sans client, prestation, prix, notes ni praticien exposés.
- APIs publiques :
  - `GET /api/portail/[organizationSlug]/services`
  - `GET /api/portail/[organizationSlug]/creneaux?serviceId=&staffId=&date=`
  - `GET /api/portail/[organizationSlug]/agenda?date=`
- Créer les réservations de façon atomique. La politique commune
  anti-chevauchement doit couvrir les créations et modifications portail et
  staff ainsi que l'approbation de demandes futures. Check des rendez-vous et
  des indisponibilités dans la transaction sérialisable ; conflit : HTTP 409.
- Ajouter `Appointment.bookingSource` avec défaut `STAFF` et valeur `PORTAL`
  pour les réservations en ligne. Le staff voit un compteur simple des
  nouvelles réservations portail du jour, rafraîchi par polling léger.

### Confirmation email
- Après commit réussi, envoyer par Resend une confirmation au contact email
  avec prestation, date/heure locale, durée et coordonnées disponibles.
- Joindre un `.ics` produit depuis le rendez-vous persisté, avec dates et
  fuseau de l'organisation corrects.
- Une erreur email ne défait pas la réservation et ne doit pas conduire à en
  créer une seconde lors d'une réémission.

## Hors scope
- Liste « Mes rendez-vous », annulation et recrédit de forfait (Phase 2).
- Demandes de changement et workflow d'approbation staff (Phase 3).
- Paiement/acompte, SMS, spécialités praticien-prestation, horaires
  hebdomadaires et indisponibilités individuelles.

## Definition of Done — Phase 1
1. Une organisation peut activer son portail avec un slug ; les routes publiques
   résolvent l'organisation par slug et renvoient 404 si elle est désactivée.
2. Un OTP correct ouvre une session uniquement pour les fiches du groupe email
   et organisation ; OTP expiré, consommé ou brute-forcé est refusé.
3. Une adresse liée à plusieurs fiches permet de sélectionner la bonne
   personne ; une adresse sans fiche ne crée pas de fiche ou de réservation.
4. La durée du service fixe la fin du rendez-vous ; les conflits avec RDV et
   indisponibilités sont détectés côté serveur.
5. Les requêtes concurrentes de création/déplacement par portail ou staff ne
   peuvent pas produire de chevauchement sur le même praticien.
6. Le payload agenda n'inclut aucune donnée client ou de prestation.
7. Le client reçoit le récapitulatif email et un `.ics` correct ; une erreur
   d'envoi ne crée pas de doublon.
8. Un compte/session client ne peut accéder aux routes staff.
