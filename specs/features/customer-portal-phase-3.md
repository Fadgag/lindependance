# 🏗️ Feature Blueprint — Portail client, Phase 3
**Statut :** IMPLEMENTED — migration à appliquer manuellement avant déploiement
**Feature :** Demandes de changement validées par le staff

> Dépend des [Phases 1 et 2](customer-portal.md#-phasage-proposé-pour-livrer-progressivement)
> et des règles communes dans [`customer-portal.md`](customer-portal.md).

## 🎯 Objectif
Permettre au client de demander un autre créneau, sans modifier lui-même son
rendez-vous. Le staff approuve ou refuse la demande depuis le back-office.

## Scope
- Modèle `AppointmentChangeRequest` lié à un rendez-vous, une fiche client et
  une organisation ; statut `PENDING`, `APPROVED` ou `REJECTED`.
- Le client ne peut demander qu'un changement de date/heure : la prestation
  et le praticien du rendez-vous original restent inchangés ; l'heure de fin
  est recalculée depuis la durée de la prestation.
- La demande conserve l'adresse e-mail vérifiée utilisée lors de sa création,
  afin d'adresser la réponse au bon client même si la fiche évolue ensuite.
- `POST /api/portail/rdv/[id]/demande-modification` vérifie l'appartenance du
  rendez-vous à une fiche reliée au groupe `(organizationId, email OTP)`, ne
  change pas `Appointment` et refuse une seconde demande `PENDING` pour ce
  rendez-vous.
- Limite additionnelle : 5 demandes de changement par client sur 24h.
- La nouvelle date demandée reste dans la fenêtre client de 60 jours glissants ;
  le sélecteur et l'API de création de demande appliquent la même borne que la
  réservation en ligne, y compris pour les requêtes directes.
- Nouvel écran staff pour consulter et approuver/refuser les demandes :
  - L'approbation vérifie dans une transaction le conflit avec les autres RDV
    du même praticien et les indisponibilités globales de l'organisation.
    Elle applique ensuite le changement et passe la demande à `APPROVED`.
  - Le refus passe la demande à `REJECTED` et peut enregistrer un motif.
- Après l'enregistrement de la décision, le client reçoit un e-mail à
  l'adresse vérifiée conservée sur la demande. L'approbation joint une
  invitation `.ics` actualisée avec le même UID et une séquence incrémentée ;
  le refus rappelle l'horaire maintenu et inclut le motif du salon lorsqu'il
  existe.
- Un échec d'envoi ne modifie pas la décision enregistrée ; l'interface staff
  indique que l'e-mail n'a pas été envoyé.
- Les demandes historiques sans adresse vérifiée conservée restent traitables,
  sans e-mail ; l'interface staff affiche cet avertissement.
- Si le staff modifie ou annule le rendez-vous original pendant qu'une demande
  est `PENDING`, rejeter la demande dans la même transaction.
- Déplacer le rendez-vous ne consomme/recrédite pas une seconde fois un crédit
  de forfait.
- Étendre le compteur staff de Phase 1 pour inclure les demandes `PENDING`.

## Hors scope
- Modification directe de rendez-vous par le client.
- Notification e-mail au staff lors de la création d'une demande.

## Definition of Done — Phase 3
1. Une demande du client n'a aucun effet sur le rendez-vous tant qu'elle n'est
   pas approuvée ; un seul état `PENDING` est possible par rendez-vous.
2. Le client ne peut pas demander un changement pour une fiche non reliée à
   son email OTP ni pour un rendez-vous d'une autre organisation.
3. L'approbation applique la nouvelle date/heure seulement si le créneau reste
   disponible au moment de la transaction ; sinon, réponse 409 et rendez-vous
   inchangé.
4. Les indisponibilités globales de l'organisation sont vérifiées lors de
   l'approbation.
5. Le staff peut refuser une demande ; la modification directe du rendez-vous
   par le staff rejette atomiquement toute demande devenue obsolète.
6. Le quota de 5 demandes sur 24h est appliqué côté serveur.
7. Le compteur staff inclut les réservations portail du jour et les demandes
   `PENDING`.
8. Une décision enregistrée déclenche un e-mail au destinataire vérifié ;
   l'approbation contient l'invitation calendrier actualisée et le refus
   contient le motif lorsqu'il est renseigné. Une panne d'envoi ne revient
   pas sur la décision et est signalée au staff.
9. La nouvelle date d'une demande reste dans la fenêtre client de 60 jours
   glissants ; une requête directe au-delà de cette borne est refusée.
