# QUALITY: Forfaits & rendez‑vous (packages ↔ appointments)

Périmètre
- API: `src/app/api/appointments/route.ts`, `src/app/api/customers/[id]/packages/route.ts`, `src/app/api/customers/route.ts`
- Front: `src/app/clients/[id]/page.tsx`, `src/components/calendar/AppointmentModal.tsx`
- DB: `prisma/schema.prisma`, migrations, `scripts/seed.js`

Objectif
- Garantir que la consommation de sessions de forfaits est atomique, sécurisée (ownership / organisation) et testée contre les races conditions.

Scénarios de validation (minimum 6)

S1 — Achat et consommation basique
- Contexte: achat d'un forfait avec sessionsRemaining=5
- Action: créer un rendez‑vous qui consomme une session
- Attendu: appointment.customerPackageId renseigné, sessionsRemaining -> 4

S2 — Refus si le forfait ne couvre pas le service
- Action: utiliser un customerPackage qui n'inclut pas le service
- Attendu: API 400, sessionsRemaining inchangé

S3 — Race condition / double réservation
- Contexte: two concurrent POST /appointments using same customerPackage when sessionsRemaining==1
- Attendu: au plus 1 création réussit; sessionsRemaining >= 0

S4 — Annulation & rollback
- Action: créer un RDV lié à forfait, puis supprimer/annuler
- Attendu: sessionsRemaining incrémente de 1 au rollback

S5 — Ownership / cross-org protection
- Action: tenter d'utiliser un CustomerPackage d'une autre organisation/customer
- Attendu: API 403/400, aucun changement

S6 — Expiration
- Contexte: CustomerPackage expiré (expiresAt < now)
- Attendu: l'API refuse l'utilisation (400) et les endpoints list ne doivent pas exposer le forfait pour usage

Tests recommandés
- Tests d'API (supertest / jest) couvrant: achats, consommation, rejet pour service non couvert, annulation, ownership.
- Test de concurrence: script d'intégration lançant 2 requêtes parallèles (sessionsRemaining == 1) et vérifiant qu'une seule passe.
- E2E rapide: script curl pour séquence achat → create appointment → vérifier decrement → annuler → vérifier increment.

Recommandations techniques (priorité)
1. Critique: dans la transaction de création d'appointment, appliquer une vérification atomique que sessionsRemaining > 0 au moment de l'update (ex: WHERE sessionsRemaining > 0) ou utiliser un contrôle optimistic lock (version) / SELECT ... FOR UPDATE selon le SGDB.
2. Systématiser le scoping par `organizationId` sur toutes les opérations sensibles (lecture & écriture). Ne jamais faire confiance aux IDs fournis côté client sans verification org/customer.
3. Ajouter contrainte d'unicité DB: `(packageId, serviceId)` pour `PackageService` et indices utiles.
4. Ajouter audit log CustomerPackageUsage pour tracer consommations/refunds.
5. Tests automatisés pour S1–S6 (unit+integration+concurrency).

Checklist rapide avant prod
- Ajouter migration DB pour contraintes/indices (si applicable).
- Backfill & audit: script pour vérifier incohérences sessionsRemaining (cette version peut produire QUALITY/backfill.sql)
- Endpoints admin pour créditer/rembourser sessions (auth restreint) pour opérations de secours.

---
Fin du document synthétique — voir `RUN_CODE_REVIEW.md` et `quality/` pour artefacts exécutables.

