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

#### [ ] ADM-01 — Voir uniquement les demandes de votre salon
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, sécurité et `customer-portal-phase-3.md`]

**Étapes :** connectez-vous à l'espace de gestion de votre salon et ouvrez la
liste des demandes de changement.

**Attendu :** seules les demandes concernant votre salon sont visibles.
L'espace de gestion n'est pas accessible depuis un compte client.

**Automatisé :** `test/api/appointment-change-requests.spec.ts`,
`test/api/appointment-portal-count.spec.ts`,
`test/proxy.portal.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-02 — Suivre les réservations et demandes
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 7]

**Étapes :** notez le nombre de nouvelles réservations et de demandes
affichées. Faites ensuite une réservation de test et envoyez une demande de
changement pour vérifier la mise à jour des compteurs.

**Attendu :** les nouvelles réservations et demandes sont comptées
séparément, uniquement pour votre salon. Les chiffres se mettent à jour sans
recharger toute la page.

**Automatisé :** `test/api/appointment-portal-count.spec.ts`,
`test/ui/portalBookingCounter.spec.tsx`. La cadence et le calcul de frontière
de journée sont à confirmer dans le navigateur.
**Résultat / preuve :** `________`

#### [ ] ADM-03 — Consulter les demandes en attente
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal.md`, §3bis]

**Étapes :** ouvrez la liste des demandes et choisissez une demande en attente.

**Attendu :** la demande indique le nom du client, le rendez-vous concerné,
l'horaire souhaité et le commentaire laissé. Une demande déjà traitée
n'apparaît plus dans la liste des demandes en attente.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts`,
`test/api/appointment-change-requests.spec.ts`,
`test/ui/appointmentChangeRequests.spec.tsx`.
**Résultat / preuve :** `________`

### Décision des demandes

#### [ ] ADM-04 — Accepter un changement d'horaire
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 1, 3 et 4]

**Étapes :** acceptez une demande dont le nouvel horaire est toujours libre.

**Attendu :** le rendez-vous est déplacé au nouvel horaire. La prestation,
le coiffeur et le forfait restent les mêmes. Le client voit le changement
dans son espace.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts`,
`test/ui/appointmentChangeRequests.spec.tsx`,
`test/services/customerPortalAppointments.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-05 — Vérifier si le nouvel horaire est encore libre
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 3–4]

**Étapes :** après réception d'une demande, prenez un autre rendez-vous sur
le même horaire demandé, puis essayez d'accepter la demande. Réessayez aussi
avec un horaire en dehors des heures d'ouverture.

**Attendu :** le changement n'est pas accepté si l'horaire n'est plus
disponible. Le rendez-vous du client conserve son horaire actuel et un message
explique qu'il faut choisir une autre solution.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts` couvre
conflit de rendez-vous et indisponibilité globale. Les limites horaires,
praticien inactif et course réelle restent à vérifier en bêta.
**Résultat / preuve :** `________`

#### [ ] ADM-06 — Refuser une demande
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, workflow staff]

**Étapes :** refusez une demande en expliquant la raison, puis refusez-en une
autre sans ajouter de commentaire.

**Attendu :** la demande est refusée et le rendez-vous garde son horaire. Le
client voit que le changement n'a pas été accepté et peut lire votre
commentaire, s'il y en a un.

**Automatisé :** `test/api/appointment-change-requests.spec.ts`,
`test/services/customerPortalChangeRequests.spec.ts`,
`test/ui/appointmentChangeRequests.spec.tsx`. La répétition d'action est
partiellement couverte par l'état pending requis côté service.
**Résultat / preuve :** `________`

#### [ ] ADM-07 — Modifier un rendez-vous ayant une demande en attente
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 5]

**Étapes :** pendant qu'une demande de changement attend une réponse, modifiez
le rendez-vous depuis le calendrier de votre salon.

**Attendu :** le rendez-vous est modifié et l'ancienne demande est retirée
des demandes en attente. Elle ne peut pas être acceptée ensuite.

**Automatisé :** `test/services/appointmentSchedulingChangeRequests.spec.ts`
et `test/services/appointmentScheduling.service.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-08 — Supprimer un rendez-vous avec une demande en attente
**Priorité : P0 · Exigence :** [Req: user-confirmed — choix de conserver le DELETE physique et l'historique de demande]

**Étapes :** dans les données de test, supprimez un rendez-vous qui a une
demande de changement en attente. Vérifiez ensuite la liste des demandes.

**Attendu :** le rendez-vous est supprimé et sa demande ne figure plus parmi
les demandes en attente. Elle ne peut pas être acceptée ensuite.

**Automatisé :** `test/services/appointmentSchedulingChangeRequests.spec.ts`.
La conservation après suppression physique doit être validée par l'équipe
technique sur la base bêta.
**Résultat / preuve :** `________`

#### [ ] ADM-09 — Vérifier l'annulation d'un rendez-vous avec une demande
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, invalidation et `customer-portal-phase-2.md`]

**Étapes :** laissez une demande de changement en attente, puis faites
annuler le rendez-vous par le client depuis son espace client.

**Attendu :** le rendez-vous est annulé, la demande disparaît de la liste et
les séances du forfait sont correctement remises à jour.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] ADM-10 — Protéger les rendez-vous déjà payés
**Priorité : P0 · Exigence :** [Req: inferred — comportement DELETE staff existant, `src/domain/appointment/policies.ts`]

**Étapes :** dans les données de test, essayez de supprimer un rendez-vous
déjà payé. Vérifiez également que vous ne pouvez pas ouvrir les demandes d'un
autre salon.

**Attendu :** le rendez-vous payé n'est pas supprimé. Vous ne pouvez pas
consulter ni traiter les demandes d'un autre salon ou voir les informations
de ses clients.

**Automatisé :** `test/services/appointmentSchedulingChangeRequests.spec.ts`
couvre la suppression d'un rendez-vous payé ; le scoping est couvert par
`test/api/appointment-change-requests.spec.ts`. Vérifier le message UI et
l'absence de fuite.
**Résultat / preuve :** `________`

### Robustesse et ergonomie

#### [ ] ADM-11 — Éviter de traiter deux fois la même demande
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, unicité pending et transaction]

**Étapes :** ouvrez la même demande dans deux sessions de l'équipe, puis
essayez de l'accepter dans les deux presque en même temps. Recommencez avec
une personne qui l'accepte et une autre qui la refuse.

**Attendu :** une seule décision est prise. Le rendez-vous n'est déplacé
qu'une fois et la première réponse reste affichée.

**Automatisé :** les tests de service vérifient qu'une demande doit être
`PENDING` ; la concurrence réelle de deux sessions reste à valider.
**Résultat / preuve :** `________`

#### [ ] ADM-12 — Comprendre les messages et utiliser la page sur téléphone
**Priorité : P2 · Exigence :** [Req: formal — spec Phase 3, écran de revue]

**Étapes :** sur un téléphone, ouvrez des demandes avec et sans commentaire.
Essayez d'accepter une demande dont l'horaire vient d'être pris.

**Attendu :** les commentaires et boutons restent lisibles. Si l'horaire n'est
plus disponible, un message clair s'affiche et la demande reste visible tant
qu'elle n'a pas été traitée.

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
