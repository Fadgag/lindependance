# Recette bêta — Portail client

## Objectif et règles de recette

Ce guide couvre les parcours client des phases 1 à 3 : accès OTP, réservation,
consultation/annulation des rendez-vous et demande de changement de créneau.
Il complète les tests Vitest ; il ne les remplace pas.

- **P0 — bloquant :** fuite de données, accès inter-organisation, accès staff
  depuis une session client, double réservation ou crédit erroné. Un échec P0
  bloque la bêta.
- **P1 — majeur :** parcours métier inutilisable ou résultat incorrect.
- **P2 — confort :** défaut visuel ou de compréhension sans perte de données.
- Pour chaque cas, noter `PASS`, `FAIL` ou `BLOQUÉ`, le build testé et un ticket
  ou une preuve sans données personnelles ni code OTP.
- Les exigences ci-dessous sont issues des specs citées. La spec Phase 1 est
  encore marquée `DRAFT` : signaler au responsable produit tout écart qui
  nécessiterait une décision métier.

## Préparation — environnement bêta uniquement

Ne pas effectuer cette recette sur la production ni avec de vrais clients.
Vérifier auprès de l'équipe technique que la migration
`20261001120000_customer_portal_phase_3` est appliquée dans l'environnement
bêta. Ne pas appliquer de migration depuis ce guide.

Créer ou demander les données de test suivantes dans l'interface staff :

| Alias | Préparation |
|---|---|
| `ORG-A` | Portail activé, slug connu, fuseau `Europe/Paris`, horaires renseignés. |
| `ORG-B` | Seconde organisation active, avec au moins un client et un rendez-vous. |
| `ORG-SOLO` | Organisation de test avec un seul praticien actif, pour vérifier le sélecteur masqué. |
| `SVC-30` / `SVC-60` | Prestations de 30 et 60 minutes, avec prix distincts. |
| `STAFF-A1` / `STAFF-A2` | Deux praticiens actifs dans `ORG-A`; prévoir aussi un praticien inactif. |
| `EMAIL-SINGLE` | Adresse de test reliée à une fiche client de `ORG-A`. |
| `EMAIL-FAMILY` | Adresse de test reliée à deux fiches de `ORG-A`, dont une fiche enfant. |
| `EMAIL-OTHER` | Adresse sans fiche dans `ORG-A`; si possible, la même adresse existe dans `ORG-B`. |
| `RDV-FAR` / `RDV-NEAR` | Rendez-vous de test à plus de 24 h, puis à 24 h ou moins de l'heure courante de l'organisation. |
| `RDV-PACKAGE` | Rendez-vous futur relié à un forfait avec un nombre de séances restant relevé avant le test. |
| Créneaux de contrôle | Un créneau libre, un créneau occupé par chaque praticien et une indisponibilité globale. |

Utiliser une boîte e-mail contrôlée par l'équipe bêta pour recevoir les OTP et
confirmations. Garder les scénarios de quota sur une adresse et une IP dédiées ;
ne pas épuiser les quotas d'autres testeurs.

**Fiche de campagne :** build/commit : `________` · testeur : `________` ·
date : `________` · navigateur/appareil : `________` · organisation : `________`

## Scénarios

### Accès public et disponibilité

#### [ ] CUS-01 — Résolution de l'organisation
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, DoD 1]

**Étapes :** ouvrir la réservation pour `ORG-A`, puis essayer un slug inconnu
et le slug d'une organisation dont le portail est désactivé.

**Attendu :** `ORG-A` s'ouvre ; les deux autres cas renvoient une page/erreur
404 sans révéler l'identifiant interne de l'organisation ni ses données.

**Automatisé :** `test/api/customer-portal-public.spec.ts` (lecture publique).
**Résultat / preuve :** `________`

#### [ ] CUS-02 — Choix de prestation, praticien et créneaux
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, parcours de réservation]

**Étapes :** dans `ORG-A`, choisir `SVC-30` puis `SVC-60`; sélectionner
`STAFF-A1` ou `STAFF-A2`. Refaire dans `ORG-SOLO`. Comparer les créneaux avec
les rendez-vous, l'indisponibilité globale et les heures d'ouverture.

**Attendu :** avec plusieurs praticiens, un choix est requis ; avec un seul,
le sélecteur est masqué et ce praticien est utilisé. La durée affichée et la
fin des créneaux suivent la prestation persistée. Les rendez-vous actifs du
même praticien et les indisponibilités globales bloquent les chevauchements ;
un rendez-vous d'un autre praticien ne bloque pas le créneau. Aucun créneau
ne dépasse les heures d'ouverture.

**Automatisé :** `test/api/customer-portal-public.spec.ts`,
`test/domain/customer-portal/scheduling.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-03 — Fuseau horaire et changement d'heure
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal.md`, §5.4]

**Étapes :** ouvrir les rendez-vous et les créneaux depuis un appareil réglé
sur un fuseau différent de celui de l'organisation ; vérifier également une
date autour d'un changement d'heure si elle est disponible dans l'environnement.

**Attendu :** heures et dates correspondent au fuseau de l'organisation, pas
au fuseau du téléphone. Aucun horaire local inexistant n'est proposé.

**Automatisé :** tests de domaine de `scheduling.spec.ts` couvrent les helpers
de fuseau et DST ; le parcours réel sur appareil reste à valider.
**Résultat / preuve :** `________`

#### [ ] CUS-04 — Agenda public anonymisé
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §3bis et sécurité]

**Étapes :** ouvrir l'agenda public et inspecter la réponse réseau JSON des
événements occupés et des indisponibilités.

**Attendu :** l'interface affiche seulement « Réservé »/indisponible. Chaque
événement contient uniquement `start`, `end` et `status` (`RESERVED` ou
`UNAVAILABLE`) ; aucun nom, client, praticien, prestation, note ou prix n'est
présent dans la réponse.

**Automatisé :** `test/api/customer-portal-public.spec.ts` vérifie la projection
et l'absence de champs privés.
**Résultat / preuve :** `________`

### Identification et identité client

#### [ ] CUS-05 — Réponse OTP anti-énumération
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §2]

**Étapes :** demander un code avec `EMAIL-SINGLE`, puis avec `EMAIL-OTHER`.
Comparer code HTTP et corps de réponse.

**Attendu :** la réponse publique est générique et identique dans les deux
cas. Seule l'adresse réellement reliée à une fiche reçoit un OTP ; aucune
fiche ni session n'est créée pour `EMAIL-OTHER`.

**Automatisé :** `test/api/customer-portal-request-code.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-06 — Cycle de vie OTP, tentatives et quotas
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §2 et sécurité]

**Étapes :** vérifier un code correct, le réutiliser, demander un renvoi puis
essayer l'ancien code ; tester un code expiré et cinq codes erronés. Sur une
adresse/IP de test dédiées, vérifier la limite de 3 envois par adresse sur
15 minutes et de 10 demandes par IP sur une heure.

**Attendu :** un code est numérique, à usage unique et valable 10 minutes ;
un renvoi invalide l'ancien. Un code expiré, consommé ou incorrect n'ouvre
pas de session ; après le maximum d'essais, il est refusé. Les limites serveur
retournent une erreur sans révéler si la fiche existe.

**Automatisé :** `test/api/customer-portal-verify-code.spec.ts` couvre les
codes invalides/consommés/expirés ; `test/domain/customer-portal/rateLimit.spec.ts`
couvre la fenêtre glissante. Renvoi, essais réels, IP et envoi e-mail restent
à confirmer dans l'environnement bêta.
**Résultat / preuve :** `________`

#### [ ] CUS-07 — Fiches familiales et cloisonnement
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, identité et réservation]

**Étapes :** se connecter avec `EMAIL-FAMILY`, consulter les rendez-vous et
commencer une réservation. Essayer ensuite un identifiant de fiche de
`ORG-B` ou d'une fiche non liée à cette adresse.

**Attendu :** les deux fiches liées à l'adresse dans `ORG-A` sont accessibles
et proposées pour la réservation ; la fiche choisie est bien celle du nouveau
rendez-vous. Aucune fiche d'une autre organisation ou non reliée à l'email
vérifié n'est visible ou réservable.

**Automatisé :** `test/api/customer-portal-public.spec.ts`,
`test/services/customerPortalBooking.spec.ts`,
`test/services/customerPortalAppointments.spec.ts`.
**Résultat / preuve :** `________`

### Réservation et rendez-vous

#### [ ] CUS-08 — Réservation avec données calculées côté serveur
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, DoD 3–5]

**Étapes :** réserver `SVC-60` pour un créneau libre. Si l'équipe autorise
l'inspection API en environnement de test, essayer aussi d'envoyer une durée,
un prix, une fin de rendez-vous ou une organisation forgés.

**Attendu :** le rendez-vous est lié à la fiche autorisée, au service et au
praticien sélectionnés dans l'organisation ; sa durée, son prix et sa fin
proviennent des données serveur. Les champs forgés sont rejetés et aucun
rendez-vous supplémentaire n'est créé.

**Automatisé :** `test/api/customer-portal-booking.spec.ts`,
`test/services/customerPortalBooking.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-09 — Conflit de créneau au moment de confirmer
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §4bis et protocole de test]

**Étapes :** ouvrir le même créneau dans deux sessions de test, puis confirmer
quasi simultanément ; répéter une réservation à la même heure avec deux
praticiens distincts.

**Attendu :** pour un même praticien, au plus une réservation réussit ; l'autre
est refusée sans doublon. Deux praticiens différents ne se bloquent pas
mutuellement. Un conflit apparu après l'affichage des créneaux est revalidé
par le serveur.

**Automatisé :** `test/services/customerPortalBooking.spec.ts` couvre un conflit
dans la transaction ; le test de concurrence multi-session reste une recette
bêta manuelle.
**Résultat / preuve :** `________`

#### [ ] CUS-10 — Confirmation e-mail, calendrier et renvoi
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, confirmation e-mail]

**Étapes :** réserver, vérifier l'e-mail et le fichier `.ics`, puis utiliser
l'action de renvoi de confirmation. Si l'équipe dispose d'un mode de panne
simulé, rejouer avec l'envoi e-mail en erreur.

**Attendu :** l'e-mail décrit le bon service, l'heure locale et la durée ;
`DTSTART`/`DTEND` et le fuseau du calendrier correspondent au rendez-vous
persisté. Un renvoi ou une panne e-mail ne crée jamais un second rendez-vous.

**Automatisé :** `test/api/customer-portal-confirmation.spec.ts`,
`test/services/customerPortalEmail.spec.ts`,
`test/api/customer-portal-booking.spec.ts`. Le fournisseur réel et l'import
dans une application calendrier sont à vérifier manuellement.
**Résultat / preuve :** `________`

#### [ ] CUS-11 — « Mes rendez-vous »
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-2.md`, DoD 1–2]

**Étapes :** ouvrir la liste avec un email familial contenant des rendez-vous
passés, futurs et annulés.

**Attendu :** seuls les rendez-vous futurs non annulés des fiches reliées à
l'email et à l'organisation apparaissent ; ils sont triés du plus proche au
plus lointain et identifient la bonne personne, prestation, praticien et
statut. Les heures sont locales à l'organisation.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts`,
`test/api/customer-portal-appointments.spec.ts`,
`test/ui/customerPortalAppointments.spec.tsx`.
**Résultat / preuve :** `________`

#### [ ] CUS-12 — Annulation et seuil des 24 heures
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-2.md`, DoD 3–5]

**Étapes :** annuler `RDV-FAR`, puis tenter d'annuler `RDV-NEAR` (exactement
24 h ou moins). Relever le nombre de séances avant/après pour `RDV-PACKAGE`.
Retenter une annulation déjà effectuée.

**Attendu :** au-delà de 24 h, le rendez-vous passe une seule fois à
`CANCELLED` et un forfait récupère exactement une séance. À 24 h ou moins,
l'API refuse, l'interface invite à contacter l'établissement et aucun crédit
ne bouge. Une annulation répétée ne recrédite pas ; un rendez-vous sans forfait
ne modifie aucun crédit.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts`,
`test/ui/customerPortalAppointments.spec.tsx`,
`test/api/customer-portal-appointments.spec.ts`.
**Résultat / preuve :** `________`

### Demande de changement de créneau — Phase 3

#### [ ] CUS-13 — Création d'une demande sans déplacement immédiat
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 1]

**Étapes :** sur un rendez-vous futur avec praticien, choisir un autre créneau
disponible et envoyer une demande avec puis sans motif.

**Attendu :** une demande `PENDING` est visible. Jusqu'à décision du staff,
l'heure du rendez-vous, sa prestation, son praticien et ses crédits restent
inchangés. La fin demandée est calculée depuis la durée réelle du service.

**Automatisé :** `test/api/customer-portal-change-requests.spec.ts`,
`test/services/customerPortalChangeRequests.spec.ts`,
`test/ui/customerPortalAppointments.spec.tsx`.
**Résultat / preuve :** `________`

#### [ ] CUS-14 — Éligibilité, demande unique et quota 24 h
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 2 et 6]

**Étapes :** tenter une demande sur un rendez-vous passé, annulé, sans
praticien ou appartenant à une autre fiche/organisation ; retenter le même
rendez-vous alors qu'une demande est déjà `PENDING`. Sur des rendez-vous de
test distincts, créer cinq demandes dans la fenêtre de 24 h puis en tenter
une sixième.

**Attendu :** les cas non éligibles et la demande pendante en doublon sont
refusés sans modifier le rendez-vous. La sixième demande est refusée côté
serveur avec une limite explicite ; les demandes OTP ne consomment pas ce
quota. Aucune donnée d'une autre fiche n'est révélée.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts`,
`test/domain/appointment/changeRequests.spec.ts`,
`test/api/customer-portal-change-requests.spec.ts`. La fenêtre réelle et son
interaction avec les appels OTP sont à vérifier sur environnement dédié.
**Résultat / preuve :** `________`

#### [ ] CUS-15 — Statut après décision du staff
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal.md`, §3ter]

**Étapes :** faire approuver une demande et en faire refuser une autre depuis
le compte staff ; actualiser « Mes rendez-vous » côté client.

**Attendu :** le client voit le statut exact (`APPROVED` ou `REJECTED`) et le
rendez-vous approuvé apparaît au nouveau créneau. Aucun e-mail de décision
n'est attendu en V1.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts` vérifie la
projection ; `test/ui/customerPortalAppointments.spec.tsx` vérifie l'état
pendant l'envoi. Vérifier la propagation réelle après décision.
**Résultat / preuve :** `________`

### Sécurité et expérience

#### [ ] CUS-16 — Session client, IDOR et origine
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, sécurité]

**Étapes :** depuis une session client, essayer d'ouvrir une page/API staff ;
sur un environnement autorisé, forger `customerId`, `organizationId`,
`serviceId` ou l'heure de fin, puis envoyer une mutation depuis une origine
externe.

**Attendu :** les routes staff sont refusées. Les mutations client utilisent
l'identité de la session OTP, rejettent les champs inattendus et refusent une
origine croisée ; un identifiant forgé n'élargit jamais l'accès.

**Automatisé :** `test/proxy.portal.spec.ts`,
`test/api/customer-portal-booking.spec.ts`,
`test/api/customer-portal-appointments.spec.ts`,
`test/api/customer-portal-change-requests.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-17 — Utilisation mobile et erreurs compréhensibles
**Priorité : P2 · Exigence :** [Req: formal — `customer-portal.md`, UX]

**Étapes :** refaire connexion, choix de créneau, annulation refusée et demande
de changement sur un téléphone ; vérifier chargement, clavier, navigation et
messages d'erreur.

**Attendu :** aucun contrôle n'est inaccessible ou coupé ; l'utilisateur
comprend si le rendez-vous est confirmé, si une demande est en attente ou s'il
doit contacter l'établissement. Une erreur réseau ne provoque pas de doublon
après une nouvelle tentative.

**Automatisé :** composants couverts par les tests UI Vitest cités ci-dessus ;
aucun parcours navigateur mobile complet n'est remplacé par ces tests.
**Résultat / preuve :** `________`

## Couverture automatisée relue

Le 1er octobre 2026, les tests ciblés portail client/admin ont réussi :
**26 fichiers, 87 tests**. Ils couvrent les règles de domaine, les services,
les routes avec doubles/mocks et plusieurs composants UI. Ils ne constituent
pas une E2E complète contre une base bêta et le fournisseur e-mail réel.
Les cas identifiés comme recette manuelle ci-dessus restent donc nécessaires.

## Décision de sortie bêta

- [ ] Aucun P0 en échec ou bloqué.
- [ ] Tous les P1 sont PASS ou font l'objet d'une dérogation produit documentée.
- [ ] Les échecs P2 sont consignés et priorisés.
- [ ] Les rendez-vous et fiches de test ont été nettoyés ou identifiés pour
  suppression par l'équipe habilitée.
