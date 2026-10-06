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
Vérifier auprès de l'équipe technique que les migrations
`20261001120000_customer_portal_phase_3` et
`20261006182000_issue_reports` sont appliquées dans l'environnement bêta. Ne
pas appliquer de migration depuis ce guide.

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
| Messages e-mail | Dans `ORG-A`, préparer les deux messages personnalisés en incluant le nom du salon et les informations indispensables ; laisser les valeurs par défaut dans `ORG-B`. |

Utiliser une boîte e-mail contrôlée par l'équipe bêta pour recevoir les OTP et
confirmations. Garder les scénarios de quota sur une adresse et une IP dédiées ;
ne pas épuiser les quotas d'autres testeurs.

**Fiche de campagne :** build/commit : `________` · testeur : `________` ·
date : `________` · navigateur/appareil : `________` · organisation : `________`

## Scénarios

### Accès public et disponibilité

#### [ ] CUS-01 — Ouvrir la réservation du bon salon
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, DoD 1]

**Étapes :** ouvrez le lien de réservation reçu et vérifiez que le nom affiché
est bien celui du salon que vous souhaitez contacter.

**Attendu :** la réservation s'ouvre pour le bon salon. Vous ne voyez aucune
information appartenant à un autre salon.

**Automatisé :** `test/api/customer-portal-public.spec.ts` (lecture publique).
**Résultat / preuve :** `________`

#### [ ] CUS-02 — Choisir une prestation, un coiffeur et un horaire
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, parcours de réservation]

**Étapes :** essayez de choisir différentes prestations, puis choisissez un
coiffeur et un horaire disponible. Recommencez dans un salon où un seul
coiffeur est proposé.

**Attendu :** vous pouvez choisir parmi les coiffeurs disponibles ; si un
seul coiffeur est proposé, il est sélectionné automatiquement. Les horaires
proposés tiennent compte de la durée de la prestation et des disponibilités
du salon.

**Automatisé :** `test/api/customer-portal-public.spec.ts`,
`test/domain/customer-portal/scheduling.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-03 — Vérifier les dates et heures des rendez-vous
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal.md`, §5.4]

**Étapes :** consultez les rendez-vous et les horaires proposés, si possible
depuis un téléphone réglé sur un autre fuseau horaire.

**Attendu :** les dates et heures correspondent à celles annoncées par le
salon et restent cohérentes entre la réservation et la liste des rendez-vous.

**Automatisé :** tests de domaine de `scheduling.spec.ts` couvrent les helpers
de fuseau et DST ; le parcours réel sur appareil reste à valider.
**Résultat / preuve :** `________`

### Identification et identité client

#### [ ] CUS-05 — Recevoir un code de connexion par e-mail
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §2]

**Étapes :** demandez un code pour `ORG-A`, puis recommencez pour `ORG-B` avec
une adresse de test qui peut recevoir les messages.

**Attendu :** le message affiché reste simple et ne révèle pas si une adresse
est déjà connue du salon. Le message de `ORG-A` reprend le texte choisi par
le salon et contient son nom ainsi que le code reçu. Le message de `ORG-B`
utilise le texte par défaut ; le code fonctionne dans les deux cas.

**Automatisé :** `test/api/customer-portal-request-code.spec.ts`,
`test/services/customerPortalEmail.spec.ts`,
`test/domain/customer-portal/emailTemplates.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-06 — Utiliser le code de connexion
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §2 et sécurité]

**Étapes :** connectez-vous avec le code reçu par e-mail. Si vous demandez un
nouveau code, essayez ensuite l'ancien code.

**Attendu :** le code reçu vous permet d'ouvrir votre espace client. Un ancien
code ou un code incorrect ne permet pas de se connecter ; le message explique
comment demander un nouveau code.

**Automatisé :** `test/api/customer-portal-verify-code.spec.ts` couvre les
codes invalides/consommés/expirés ; `test/domain/customer-portal/rateLimit.spec.ts`
couvre la fenêtre glissante. Renvoi, essais réels, IP et envoi e-mail restent
à confirmer dans l'environnement bêta.
**Résultat / preuve :** `________`

#### [ ] CUS-07 — Retrouver les rendez-vous de votre famille
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, identité et réservation]

**Étapes :** connectez-vous avec l'adresse e-mail partagée par plusieurs
membres de votre famille, puis consultez les rendez-vous et commencez une
réservation pour l'un d'eux.

**Attendu :** vous pouvez choisir le membre de la famille concerné et voir ses
rendez-vous. Les informations d'autres clients restent privées.

**Automatisé :** `test/api/customer-portal-public.spec.ts`,
`test/services/customerPortalBooking.spec.ts`,
`test/services/customerPortalAppointments.spec.ts`.
**Résultat / preuve :** `________`

### Réservation et rendez-vous

#### [ ] CUS-08 — Réserver une prestation
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, DoD 3–5]

**Étapes :** choisissez une prestation, un coiffeur et un horaire libre, puis
confirmez la réservation.

**Attendu :** la confirmation reprend le bon salon, la bonne prestation, le
coiffeur choisi, l'horaire et le prix affichés avant la réservation.

**Automatisé :** `test/api/customer-portal-booking.spec.ts`,
`test/services/customerPortalBooking.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-09 — Éviter une double réservation
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, §4bis et protocole de test]

**Étapes :** ouvrez le même horaire disponible dans deux fenêtres de test et
confirmez d'abord la réservation dans l'une, puis dans l'autre.

**Attendu :** le premier rendez-vous est confirmé. Le même horaire n'est plus
proposé comme disponible et ne peut pas être réservé une deuxième fois.

**Automatisé :** `test/services/customerPortalBooking.spec.ts` couvre un conflit
dans la transaction ; le test de concurrence multi-session reste une recette
bêta manuelle.
**Résultat / preuve :** `________`

#### [ ] CUS-10 — Recevoir la confirmation de réservation
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-1.md`, confirmation e-mail]

**Étapes :** effectuez une réservation dans `ORG-A`, puis une autre dans
`ORG-B`. Vérifiez les deux e-mails de confirmation. Ouvrez la pièce jointe
calendrier du message de `ORG-A` dans votre application d'agenda.

**Attendu :** le message de `ORG-A` reprend le texte choisi par le salon et
indique la bonne prestation, la date et l'horaire. `ORG-B` utilise le texte
par défaut. La pièce jointe contient le bon rendez-vous et son import ne crée
pas de réservation supplémentaire.

**Automatisé :** `test/api/customer-portal-confirmation.spec.ts`,
`test/services/customerPortalEmail.spec.ts`,
`test/api/customer-portal-booking.spec.ts`,
`test/domain/customer-portal/emailTemplates.spec.ts`. Le fournisseur réel et
l'import dans une application calendrier sont à vérifier manuellement.
**Résultat / preuve :** `________`

#### [ ] CUS-11 — Retrouver vos prochains rendez-vous
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal-phase-2.md`, DoD 1–2]

**Étapes :** ouvrez la page « Mes rendez-vous » après avoir pris un rendez-vous
et vérifiez la liste affichée.

**Attendu :** vos prochains rendez-vous apparaissent du plus proche au plus
lointain, avec la bonne prestation, le bon coiffeur et le bon horaire.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts`,
`test/api/customer-portal-appointments.spec.ts`,
`test/ui/customerPortalAppointments.spec.tsx`.
**Résultat / preuve :** `________`

#### [ ] CUS-12 — Annuler un rendez-vous
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-2.md`, DoD 3–5]

**Étapes :** annulez un rendez-vous prévu dans plus d'un jour. Essayez ensuite
d'annuler un rendez-vous prévu dans moins d'un jour.

**Attendu :** vous pouvez annuler en ligne le rendez-vous suffisamment éloigné.
Pour un rendez-vous imminent, un message vous indique de contacter le salon.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts`,
`test/ui/customerPortalAppointments.spec.tsx`,
`test/api/customer-portal-appointments.spec.ts`.
**Résultat / preuve :** `________`

### Demande de changement de créneau — Phase 3

#### [ ] CUS-13 — Demander un autre horaire
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 1]

**Étapes :** pour un rendez-vous à venir, choisissez un autre horaire proposé
et envoyez votre demande, avec ou sans commentaire.

**Attendu :** votre demande apparaît comme en attente. Le rendez-vous garde son
horaire actuel tant que le salon ne vous a pas répondu.

**Automatisé :** `test/api/customer-portal-change-requests.spec.ts`,
`test/services/customerPortalChangeRequests.spec.ts`,
`test/ui/customerPortalAppointments.spec.tsx`.
**Résultat / preuve :** `________`

#### [ ] CUS-14 — Suivre une demande déjà envoyée
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal-phase-3.md`, DoD 2 et 6]

**Étapes :** envoyez une demande de changement pour un rendez-vous. Avant que
le salon ait répondu, essayez d'en envoyer une autre pour ce même rendez-vous.

**Attendu :** une seule demande est en attente à la fois pour ce rendez-vous.
Le rendez-vous ne change pas avant la réponse du salon.

**Automatisé :** `test/services/customerPortalChangeRequests.spec.ts`,
`test/domain/appointment/changeRequests.spec.ts`,
`test/api/customer-portal-change-requests.spec.ts`. La fenêtre réelle et son
interaction avec les appels OTP sont à vérifier sur environnement dédié.
**Résultat / preuve :** `________`

#### [ ] CUS-15 — Voir la réponse du salon
**Priorité : P1 · Exigence :** [Req: formal — `customer-portal.md`, §3bis]

**Étapes :** après la réponse du salon à votre demande, ouvrez ou actualisez
la page « Mes rendez-vous ».

**Attendu :** vous voyez si le changement a été accepté ou refusé. Si le salon
l'accepte, le rendez-vous apparaît au nouvel horaire.

**Automatisé :** `test/services/customerPortalAppointments.spec.ts` vérifie la
projection ; `test/ui/customerPortalAppointments.spec.tsx` vérifie l'état
pendant l'envoi. Vérifier la propagation réelle après décision.
**Résultat / preuve :** `________`

### Sécurité et expérience

#### [ ] CUS-16 — Vérifier la confidentialité de votre espace
**Priorité : P0 · Exigence :** [Req: formal — `customer-portal.md`, sécurité]

**Étapes :** connectez-vous à votre espace client et essayez d'ouvrir une page
réservée à l'équipe du salon. Vérifiez que seuls vos rendez-vous et ceux des
membres de votre famille autorisés sont visibles.

**Attendu :** les pages de l'équipe ne sont pas accessibles depuis votre
espace client et les informations des autres clients restent privées.

**Automatisé :** `test/proxy.portal.spec.ts`,
`test/api/customer-portal-booking.spec.ts`,
`test/api/customer-portal-appointments.spec.ts`,
`test/api/customer-portal-change-requests.spec.ts`.
**Résultat / preuve :** `________`

#### [ ] CUS-17 — Utiliser le service sur un téléphone et signaler un problème
**Priorité : P2 · Exigence :** [Req: formal — `customer-portal.md`, UX et `issue-reporting.md`]

**Étapes :** sur un téléphone, connectez-vous, choisissez un horaire, consultez
vos rendez-vous et essayez de demander un changement. Ouvrez aussi « Signaler
un problème », lisez les informations transmises, puis envoyez un signalement
de test sans donnée personnelle.

**Attendu :** les boutons et les messages sont faciles à lire et à utiliser.
Vous comprenez si le rendez-vous est confirmé, si le salon doit répondre ou
s'il faut le contacter. Le formulaire précise les informations techniques
jointes et confirme l'envoi ; l'équipe technique retrouve le signalement dans
son tableau de suivi.

**Automatisé :** `test/ui/IssueReportLauncher.spec.tsx`,
`test/lib/clientIssueErrors.spec.ts` et composants couverts par les tests UI
Vitest cités ci-dessus ; aucun parcours navigateur mobile complet n'est
remplacé par ces tests. La réception réelle est à vérifier en bêta avec l'équipe
technique.
**Résultat / preuve :** `________`

## Couverture automatisée relue

Les suites automatisées pertinentes sont indiquées sous chaque scénario. Elles
couvrent les règles de domaine, services, routes et composants UI, parfois avec
des doubles ou des mocks ; elles ne remplacent pas une vérification complète
sur la base bêta et avec le fournisseur e-mail réel. Les cas identifiés comme
recette manuelle ci-dessus restent donc nécessaires.

## Décision de sortie bêta

- [ ] Aucun P0 en échec ou bloqué.
- [ ] Tous les P1 sont PASS ou font l'objet d'une dérogation produit documentée.
- [ ] Les échecs P2 sont consignés et priorisés.
- [ ] Les rendez-vous et fiches de test ont été nettoyés ou identifiés pour
  suppression par l'équipe habilitée.
