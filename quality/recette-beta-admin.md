# Recette bêta — Administration du portail client

## Objectif et règles de recette

Ce guide est destiné aux comptes **staff/admin** et couvre la configuration
utile du portail, le compteur et le traitement des demandes de changement
Phase 3. Le mot « admin » désigne ici un utilisateur staff rattaché à une
organisation ; il ne donne pas accès aux autres organisations.

- **P0 — bloquant :** accès non autorisé, fuite inter-organisation, double
  réservation, approbation d'un créneau invalide ou erreur de forfait.
- **P1 — majeur :** demande perdue, mauvaise décision ou compteur incorrect.
- **P2 — confort :** affichage, libellé ou comportement responsive.
- Marquer chaque cas `PASS`, `FAIL` ou `BLOQUÉ` et joindre une preuve/ticket
  expurgé de toute donnée personnelle.
- Les critères viennent des specs indiquées dans chaque cas ; la Phase 1 est
  encore marquée `DRAFT`. Faire arbitrer les écarts fonctionnels plutôt que
  de modifier silencieusement les attentes.

## Préparation — environnement bêta uniquement

Ne pas tester sur la production. L'équipe technique doit confirmer que la
migration `20261001120000_customer_portal_phase_3` est appliquée à la base
bêta ; les testeurs ne doivent pas exécuter de migration.

Préparer dans l'interface staff :

| Alias | Préparation |
|---|---|
| `ORG-A` / `ORG-B` | Deux organisations actives distinctes ; compte staff dédié dans chacune. |
| Portail `ORG-A` | Activé avec slug et fuseau connus ; préparer aussi `ORG-SOLO` si le test des praticiens mono-staff est nécessaire. |
| Praticiens et services | Deux praticiens actifs, un inactif, services de 30 et 60 minutes, horaires connus. |
| Demandes | Plusieurs demandes `PENDING`, une demande déjà rejetée et une demande approuvée. |
| Créneaux | Un créneau libre, un occupé par le même praticien, un occupé par un autre praticien et une indisponibilité globale. |
| Forfait | Rendez-vous de test lié à un forfait ; relever les crédits avant le test. |
| Rendez-vous | Un rendez-vous modifiable, un rendez-vous supprimable, un rendez-vous `PAID` et un rendez-vous client annulable à plus de 24 h. |

**Fiche de campagne :** build/commit : `________` · testeur : `________` ·
date : `________` · navigateur/appareil : `________` · organisation : `________`

## Scénarios

### Accès, périmètre et notifications

#### [ ] ADM-01 — Accès staff et organisation courante
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, sécurité et `customer-portal-phase-3.md`]

**Étapes :** se connecter avec le compte staff de `ORG-A`, ouvrir
`/change-requests`, puis ouvrir une session staff de `ORG-B` et refaire
l'opération. Essayer les mêmes pages/API avec une session client.

**Attendu :** le compte staff n'accède qu'aux demandes de son organisation ;
la session client est refusée pour la page et les actions de revue. Les
identifiants de demande d'une autre organisation ne permettent ni lecture,
ni approbation, ni refus.

**Automatisé :** `test/api/appointment-change-requests.spec.ts`,
`test/api/appointment-portal-count.spec.ts`,
`test/proxy.portal.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-02 — Compteur et accès à la file de demandes
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 7]

**Étapes :** relever les réservations portail créées aujourd'hui dans le
fuseau de `ORG-A` et le nombre de demandes en attente. Créer une réservation
portail et une demande, puis attendre le rafraîchissement du compteur.

**Attendu :** le compteur montre séparément les réservations portail du jour
et les demandes `PENDING`, est limité à l'organisation et se rafraîchit sans
rechargement complet. Les rendez-vous saisis par le staff, annulés ou créés
hors de la journée locale ne gonflent pas le compteur de réservations portail.
Le lien mène à `/change-requests`.

**Automatisé :** `test/api/appointment-portal-count.spec.ts`,
`test/ui/portalBookingCounter.spec.tsx`. La cadence et le calcul de frontière
de journée sont à confirmer dans le navigateur.
**Résultat / preuve :** `________`

#### [ ] ADM-03 — File de revue
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal.md`, §3ter]

**Étapes :** ouvrir la file avec des demandes pendantes, approuvées, rejetées
et une demande liée à `ORG-B`.

**Attendu :** seules les demandes `PENDING` de l'organisation courante sont
affichées. Chaque ligne montre le client, le rendez-vous d'origine, le service,
le praticien, le créneau demandé, le motif et les heures dans le fuseau de
l'organisation. Une demande traitée disparaît de la file.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts`,
`test/api/appointment-change-requests.spec.ts`,
`test/ui/appointmentChangeRequests.spec.tsx`.
**Résultat / preuve :** `________`

### Décision des demandes

#### [ ] ADM-04 — Approbation d'un créneau valide
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 1, 3 et 4]

**Étapes :** approuver une demande dont le créneau est encore libre et dans
les heures d'ouverture.

**Attendu :** le rendez-vous d'origine est déplacé ; sa fin est recalculée à
partir de la durée persistée du service. La prestation, le praticien et le
lien forfait restent inchangés ; aucun crédit supplémentaire n'est consommé.
La demande passe à `APPROVED`, indique le réviseur, et le client voit le
nouveau créneau et le statut.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts`,
`test/ui/appointmentChangeRequests.spec.tsx`,
`test/services/customerPortalAppointments.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-05 — Revalidation à l'approbation
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 3–4]

**Étapes :** après création d'une demande, occuper son créneau avec un
rendez-vous du même praticien. Recommencer sur un créneau bloqué par une
indisponibilité globale, hors des heures de l'organisation, passé ou associé
à un praticien désactivé.

**Attendu :** chaque approbation est refusée avec un conflit compréhensible.
Le rendez-vous conserve son heure initiale et la demande n'est pas marquée
`APPROVED`. Un rendez-vous d'un autre praticien ne doit pas être traité comme
un conflit de praticien, mais une indisponibilité globale bloque tous les
praticiens.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts` couvre
conflit de rendez-vous et indisponibilité globale. Les limites horaires,
praticien inactif et course réelle restent à vérifier en bêta.
**Résultat / preuve :** `________`

#### [ ] ADM-06 — Refus avec ou sans motif
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, workflow staff]

**Étapes :** refuser une demande avec motif, puis une autre sans motif.
Essayer ensuite de l'approuver ou de la refuser une seconde fois.

**Attendu :** la demande passe une seule fois à `REJECTED`, le motif staff
est enregistré lorsqu'il est fourni et l'heure du rendez-vous ne change pas.
Les actions répétées échouent sans écraser la décision initiale. Le client
voit le statut de rejet.

**Automatisé :** `test/api/appointment-change-requests.spec.ts`,
`test/services/customerPortalChangeRequests.spec.ts`,
`test/ui/appointmentChangeRequests.spec.tsx`. La répétition d'action est
partiellement couverte par l'état pending requis côté service.
**Résultat / preuve :** `________`

#### [ ] ADM-07 — Modification directe du rendez-vous
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 5]

**Étapes :** pendant qu'une demande est `PENDING`, déplacer le rendez-vous
depuis le calendrier/back-office avec une modification directe.

**Attendu :** la modification staff réussit selon les règles habituelles et,
dans la même opération, la demande devient `REJECTED` avec le motif système
« RDV modifié directement par l’organisation ». Elle disparaît de la file ;
son approbation ultérieure est impossible.

**Automatisé :** `test/services/appointmentSchedulingChangeRequests.spec.ts`
et `test/services/appointmentScheduling.service.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-08 — Suppression du rendez-vous d'origine
**Priorité : P0 · Exigence :** [Req: user-confirmed — choix de conserver le DELETE physique et l'historique de demande]

**Étapes :** supprimer un rendez-vous non payé qui porte une demande
`PENDING`, puis vérifier la file et, si l'accès DBA est prévu, la ligne
d'historique en base.

**Attendu :** le rendez-vous est supprimé selon le comportement staff existant,
la demande est rejetée avant la suppression et ne peut plus être approuvée.
L'historique de la demande reste conservé avec `appointmentId` détaché ;
cette dernière assertion est une vérification technique, pas un écran bêta.

**Automatisé :** `test/services/appointmentSchedulingChangeRequests.spec.ts`.
La conservation après suppression physique doit être validée par l'équipe
technique sur la base bêta.
**Résultat / preuve :** `________`

#### [ ] ADM-09 — Annulation du client pendant une demande
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, invalidation et `customer-portal-phase-2.md`]

**Étapes :** laisser une demande `PENDING`, puis annuler le rendez-vous côté
client alors qu'il reste plus de 24 h.

**Attendu :** l'annulation est acceptée selon la règle Phase 2 ; la demande
devient `REJECTED` avec le motif d'annulation client dans la même transaction.
Le forfait est recrédité au plus une fois et la demande ne peut pas être
approuvée.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-10 — Rendez-vous payé et protection des données
**Priorité : P0 · Exigence :** [Req: inferred — comportement DELETE staff existant, `src/domain/appointment/policies.ts`]

**Étapes :** tenter de supprimer un rendez-vous payé, avec ou sans demande
pendante. Essayer également d'approuver/refuser une demande de `ORG-B` en
changeant l'identifiant dans l'URL.

**Attendu :** la suppression du rendez-vous payé est refusée et ne doit pas
supprimer l'appointment. Un compte `ORG-A` ne peut pas traiter la demande
`ORG-B`. Aucun détail privé d'un autre client/organisation n'est renvoyé.

**Automatisé :** `test/services/appointmentSchedulingChangeRequests.spec.ts`
couvre la suppression d'un rendez-vous payé ; le scoping est couvert par
`test/api/appointment-change-requests.spec.ts`. Vérifier le message UI et
l'absence de fuite.
**Résultat / preuve :** `________`

### Robustesse et ergonomie

#### [ ] ADM-11 — Actions concurrentes et reprise après erreur
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, unicité pending et transaction]

**Étapes :** ouvrir la même demande dans deux sessions staff et approuver
quasi simultanément ; refaire avec une approbation et un refus concurrents.
Répéter un appel après une erreur réseau simulée si l'environnement le permet.

**Attendu :** une seule décision est appliquée ; l'autre action reçoit une
réponse de conflit/non-pending, sans deuxième déplacement ni perte de la
première décision. Une reprise ne doit pas produire de modification en double.

**Automatisé :** les tests de service vérifient qu'une demande doit être
`PENDING` ; la concurrence réelle de deux sessions reste à valider.
**Résultat / preuve :** `________`

#### [ ] ADM-12 — Motifs, messages et usage sur écran réduit
**Priorité : P2 · Exigence :** [Req: formal — spec Phase 3, écran de revue]

**Étapes :** vérifier les demandes sans motif, avec motif long, les réponses
409 (créneau devenu indisponible) et 404 (demande traitée/introuvable) ; ouvrir
la page sur un écran réduit.

**Attendu :** les motifs sont lisibles, une erreur ne retire pas une demande
qui reste pendante et l'interface permet de la traiter ou d'actualiser la
file. Aucun changement n'est présenté comme réussi avant confirmation serveur.

**Automatisé :** `test/ui/appointmentChangeRequests.spec.tsx` vérifie le rendu
et l'envoi des actions ; les états d'erreur réels doivent être vérifiés
manuellement.
**Résultat / preuve :** `________`

## Couverture automatisée relue

Le 1er octobre 2026, la sélection de tests portail client/admin a réussi :
**26 fichiers, 87 tests**. Elle comprend les services et routes de revue, le
compteur, l'UI et les mutations directes staff. La suite utilise des mocks pour
plusieurs couches ; elle ne prouve pas le comportement complet d'un navigateur
connecté à la base et aux e-mails bêta.

## Décision de sortie bêta

- [ ] Aucun P0 en échec ou bloqué.
- [ ] Tous les P1 sont PASS ou font l'objet d'une dérogation produit documentée.
- [ ] Les scénarios de concurrence, isolation inter-organisation et invalidation
  ont été essayés sur données bêta.
- [ ] Les données de test et leurs forfaits ont été remis à l'état initial ou
  signalés à l'équipe habilitée.
