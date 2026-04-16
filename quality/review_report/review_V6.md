# Review V6 — Audit rapide (Anti-IDOR, Performance, Clean Code)

Date: 2026-04-16T00:00:00Z
Auteur: automated-reviewer

Résumé exécutif
--------------
Revue ciblée sur sécurité (Anti‑IDOR), scalabilité/performance et qualité de code. Globalement le projet applique une politique Zero‑Trust cohérente : la plupart des routes API et server actions résolvent l'`organizationId` depuis la session (`auth()`) et l'utilisent systématiquement dans les filtres Prisma. Quelques points à corriger rapidement (priorité haute) pour fermer des risques d'IDOR potentiels et éviter des fuites / manipulations cross‑organization :

- Critique / High : endpoints/manipulations qui n'authentifient pas la propriété d'un resource lié (ex : `serviceId`, `customerId`, `staffId`) avant création d'un `Appointment` dans `src/app/api/appointments/route.ts` (POST) — possibilité de lier des entities d'une autre organisation.
- Majeur / Medium : lecture via `findUnique` sans contrainte `organizationId` (le cas du service price dans la même route) — fuite d'information possible.
- Divers : bonnes pratiques de performances et ergonomie (pagination, selective select) recommandées sur endpoints larges (ex: GET /api/customers). 

Observations positives
---------------------
- La majorité des API routes (customers, services, appointments actions server-side) vérifient `session.user.organizationId` et appliquent des where:{ organizationId: orgId } — bonne couverture Zero‑Trust.
- Server Action `createCustomerAndReturn` applique validation Zod, vérification organizationId, déduplication et revalidation de path — implémentation sécurisée et robuste.
- Tests et process de review existent (répertoire `quality/review_report/` avec V1..V5) — bonne démarche qualité.

Fichiers scannés (extraits clé)
-------------------------------
- `src/actions/createCustomerAndReturn.ts` — bonne validation orgId + déduplication (ligne 20, 35..45, 45..54).
- `src/app/api/customers/route.ts` — GET/POST/PUT protégé par auth et where: { organizationId }.
- `src/app/api/appointments/route.ts` — protections globales OK, mais POST contient des lectures/créations non scoping-safe (voir détails plus bas).
- `prisma/schema.prisma` — relations existantes; la DB n'enforce pas le scoping orgId automatiquement (les FK ne garantissent pas la cohérence orgId entre relations) — il faut garder logiques de vérification côté application.

Problèmes identifiés (détail & recommandations)
------------------------------------------------
1) High — `/src/app/api/appointments/route.ts` POST : lecture/usage de `serviceId`, `customerId`, `staffId` sans vérification d'appartenance à l'organisation
   - Observation :
     - Ligne 86 : `const svc = await prisma.service.findUnique({ where: { id: serviceId }, select: { price: true } })` — `findUnique` n'impose pas `organizationId`.
     - Lors de la création d'un `appointment`, les champs `serviceId`, `customerId`, `staffId` sont insérés tels quels ; la route ne vérifie pas que ces ressources appartiennent à `session.user.organizationId`.
   - Risque : un attaquant malicieux d'une orgA pourrait fournir un `serviceId`/`customerId` appartenant à orgB et provoquer :
     - Assignation d'appointments croisés entre organisations (data integrity leak)
     - Fuite d'information (prix d'un service d'une autre org via le `findUnique`)
   - Recommandation (correction rapide) :
     - Remplacer `findUnique` par `findFirst` / `findFirst({ where: { id: x, organizationId: orgId } })` pour toute lecture sensible.
     - Avant `prisma.appointment.create`, valider explicitement que `serviceId`, `customerId` (et si fourni `staffId`) appartiennent à `orgId`. Exemple :

```ts
// Pseudo-correctif
const svc = await prisma.service.findFirst({ where: { id: serviceId, organizationId: session.user.organizationId }, select: { price: true } })
if (!svc) return NextResponse.json({ error: 'Service introuvable' }, { status: 404 })

const customerCheck = await prisma.customer.findFirst({ where: { id: customerId, organizationId: session.user.organizationId } })
if (!customerCheck) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

if (staffId) {
  const staffCheck = await prisma.staff.findFirst({ where: { id: staffId, organizationId: session.user.organizationId } })
  if (!staffCheck) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
}
```

   - Priorité: High. Patch recommandé en hotfix avant mise en production.

2) Medium — `prisma.service.findUnique` utilisé ailleurs (ex: `src/services/dashboard.service.ts` pour lecture d'organisation) — souvent OK pour organization lookup, mais signaler toute utilisation `findUnique({ where: { id } })` sur resources multi-tenant où `id` provient d'une entrée utilisateur.
   - Recommandation : privilégier `findFirst({ where: { id, organizationId } })` quand l'id provient d'une source cliente non sûre.

3) Medium — `GET /api/customers` retourne tous les clients sans pagination (ligne 68..83). Pour des organisations ayant beaucoup de clients, cela peut impacter mémoire et latence.
   - Recommendation : ajouter `limit`/`offset` ou pagination cursor-based. Au minimum, support de `?q=` + `?limit=` + `?page=`.

4) Low — warnings Tailwind CSS sur classes arbitraires (ex: `bg-[var(--studio-bg)]`) — esthétique/CI, pas bloquant. (v. commit `Sidebar` ajouté `hidden md:flex` — bonne fix)

5) Clean code / perf — Revalidate path utilisé (ok), mais envisager revalidation ciblée vs full path depending on scale.

Patches proposés (extraits prêts à appliquer)
--------------------------------------------
- Fix IDOR in appointments POST (minimal patch):
  - remplacer la lecture du service par `findFirst` avec orgId.
  - valider `customerId` et `staffId` appartenance avant create.
  - conserver `organizationId: session.user.organizationId` dans le create (déjà présent).

- Exemple de diff (concept) à appliquer dans `src/app/api/appointments/route.ts` autour des lignes 83..102 :

```diff
- const svc = await prisma.service.findUnique({ where: { id: serviceId }, select: { price: true } })
- const servicePrice = svc?.price ?? 0
+ // Ensure the referenced service belongs to the user's organization
+ const svc = await prisma.service.findFirst({ where: { id: serviceId, organizationId: session.user.organizationId }, select: { price: true } })
+ if (!svc) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
+ const servicePrice = svc.price ?? 0
+
+ // Ensure provided customer/staff belong to the org
+ const customerCheck = await prisma.customer.findFirst({ where: { id: customerId, organizationId: session.user.organizationId } })
+ if (!customerCheck) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
+ if (staffId) {
+   const staffCheck = await prisma.staff.findFirst({ where: { id: staffId, organizationId: session.user.organizationId } })
+   if (!staffCheck) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
+ }
```

Checklist QA (après correction)
--------------------------------
- [ ] Tester création d'un appointment en fournissant `serviceId`/`customerId`/`staffId` valides dans la même org => OK (201)
- [ ] Tenter la même opération en utilisant un `serviceId` appartenant à une autre org => doit renvoyer 404/403, pas créer l'appointment
- [ ] Vérifier que la lecture du prix n'expose pas les prix d'autres orgs
- [ ] Vider cache / re-issuance de tokens si nécessaire, vérifier logs

Notes opérationnelles
---------------------
- La base Prisma/DB ne force pas le scoping `organizationId` entre relations : c'est à l'application de s'assurer que toutes les relations référencées appartiennent à la même organisation quand cela est attendu.
- Le correctif est simple et local (quelques appels `findFirst` supplémentaires). Priorité: déploiement en hotfix avant exposition publique.

Actions recommandées immédiates
--------------------------------
1. Appliquer le correctif IDOR sur `src/app/api/appointments/route.ts` POST (et vérifier tout usage similaire ailleurs).
2. Ajouter tests unitaires / intégration qui simulent cross-org references pour empêcher regressions.
3. Ajouter une règle ESLint/CI (custom) qui détecte `findUnique`/`findFirst` usages sur multi-tenant resources sans `organizationId` quand l'id provient d'un input.
4. Ajouter pagination aux endpoints massifs (customers) si scale attendu.

Changes already prepared
------------------------
- J'ai appliqué localement et commité un fix CSS responsive pour la `Sidebar` (`hidden md:flex`) sur la branche `fix/mobile-hide-sidebar`. Aucune push distant effectué (prêt pour PR/review).

Fichier de sortie
-----------------
Ce rapport a été écrit dans : `quality/review_report/review_V6.md`

Fin du rapport.

