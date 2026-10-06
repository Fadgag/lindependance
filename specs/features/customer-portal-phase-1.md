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
- Ajouter `portalContactPhone` et `portalContactEmail` nullable sur
  `Organization`, configurables dans `/settings/portail` et affichés aux
  clients. Au moins une de ces coordonnées est requise pour activer le portail.
- L'activation requiert au moins un praticien actif. Désactiver ou archiver le
  dernier praticien actif désactive aussi le portail dans la même transaction
  et envoie après commit un e-mail à tous les utilisateurs `ADMIN` de
  l'organisation. Réactiver un praticien ne réactive pas le portail.
- Ajouter un email de contact portail nullable et non unique à `Customer`.
  Le staff le gère ; le même email peut être placé sur les fiches de membres
  d'une famille.
- Ajouter l'écran staff `/settings/portail` pour renseigner le slug et activer
  ou désactiver le portail.
- Le portail public résout toute organisation par slug et n'expose jamais
  l'id interne. Slug inconnu, portail désactivé ou absence de praticien actif :
  404 sur les pages et API publiques, y compris les sessions client existantes.
- La page de réservation affiche le nom de l'organisation et son logo configuré.

### Identification OTP
- Le visiteur entre le slug de l'organisation et l'email. Si des fiches
  correspondantes existent, envoyer un code OTP via Resend ; la réponse reste
  identique si aucune fiche n'existe.
- OTP numérique, usage unique, stocké hashé/HMAC, expiration 10 minutes,
  maximum 5 essais ; renvoi invalide le précédent.
- Le formulaire affiche une aide neutre invitant à contacter le salon si le
  client ne reçoit pas de code, avec les coordonnées publiques configurées.
  La réponse de demande OTP reste identique qu'une fiche existe ou non.
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
- Si aucun praticien n'est actif, le portail public est indisponible : il ne
  présente pas un parcours de réservation vide.
- Le serveur charge la prestation et utilise sa durée et son prix depuis la
  base. Il calcule l'heure de fin ; les valeurs envoyées par le navigateur ne
  font pas autorité.
- Les heures d'ouverture/fermeture actuelles s'appliquent tous les jours.
  Les rendez-vous actifs bloquent le praticien ; les indisponibilités
  `Unavailability` sont globales et bloquent tous les praticiens.
- APIs publiques :
  - `GET /api/portail/[organizationSlug]/services`
  - `GET /api/portail/[organizationSlug]/creneaux?serviceId=&staffId=&date=`
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
1. Une organisation peut activer son portail avec un slug, au moins un
   praticien actif et un moyen de contact public ; les routes renvoient 404 si
   le portail est désactivé ou qu'aucun praticien n'est actif.
2. Désactiver ou archiver le dernier praticien désactive le portail dans la
   même transaction, envoie un e-mail à tous les administrateurs après commit,
   et sa réactivation n'active pas automatiquement le portail.
3. Un OTP correct ouvre une session uniquement pour les fiches du groupe email
   et organisation ; OTP expiré, consommé ou brute-forcé est refusé.
4. Une adresse liée à plusieurs fiches permet de sélectionner la bonne
   personne ; une adresse sans fiche ne crée pas de fiche ou de réservation.
5. La demande de code reste neutre pour les adresses avec ou sans fiche et
   affiche l'aide de contact sans révéler l'existence d'une fiche.
6. La durée du service fixe la fin du rendez-vous ; les conflits avec RDV et
   indisponibilités sont détectés côté serveur.
7. Les requêtes concurrentes de création/déplacement par portail ou staff ne
   peuvent pas produire de chevauchement sur le même praticien.
8. Le payload agenda n'inclut aucune donnée client ou de prestation.
9. Le client reçoit le récapitulatif email et un `.ics` correct ; une erreur
   d'envoi ne crée pas de doublon.
10. Un compte/session client ne peut accéder aux routes staff.
