# 🧪 Next.js Code Review Report

## 🧾 Résumé
- Score: 5/100  
- Verdict: ❌ BLOCK
- Critical Issues: 2
- Major Issues: 4
- Minor Issues: 5

---

## 🔴 Critical Issues (Blocking)

### 1) [SECURITY / AUTH] Absence d'authentification & d'autorisation explicite dans les routes API
**Problem**  
Les handlers (ex. `src/app/api/appointments/route.ts`) ne vérifient pas l'authentification ni l'autorisation : ils utilisent `prisma.organization.findFirst()` et effectuent des opérations sensibles (création/suppression d'appointments, decrement/increment de sessions) sans valider l'identité/organisation de l'appelant.

**Impact**  
Un client non autorisé peut créer/éditer/supprimer des rendez‑vous et manipuler des consommations de forfaits pour n'importe quelle organisation/customer — fuite de données et fraude possibles.

**Fix**  
- Ajouter une extraction de session/utilisateur (middleware ou utilitaire) et récupérer `organizationId`.
- Inclure `organizationId` dans tous les `where` sensibles ou valider que la ressource appartient à la session.
- Retourner 401/403 quand l'appelant n'est pas autorisé.

Exemple schématique :

```ts
// src/lib/auth.ts
export async function getSessionFromRequest(req: Request) {
  // adapter (cookie, JWT, next-auth, ...)
  // return { userId, organizationId, roles }
}

// dans l'API
const session = await getSessionFromRequest(request);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const orgId = session.organizationId;
// utiliser orgId dans les requêtes prisma
```

---

### 2) [DATA INTEGRITY] Race condition — décrémentation sessionsRemaining non atomique / possible < 0
**Problem**  
La logique actuelle décrémente `sessionsRemaining` après (ou dans) la création d'un appointment sans mise à jour conditionnelle atomique. Avec deux requêtes concurrentes (sessionsRemaining === 1), les deux peuvent aboutir, créant incohérence et sessions negatives.

**Impact**  
Consommation incohérente, facturation erronée, nécessité d'interventions manuelles.

**Fix**  
Utiliser une mise à jour atomique conditionnelle (pattern `updateMany` avec `where: { sessionsRemaining: { gt: 0 } }`) dans une transaction et vérifier le `count`.

Exemple :

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.customerPackage.updateMany({
    where: { id: customerPackageId, sessionsRemaining: { gt: 0 } },
    data: { sessionsRemaining: { decrement: 1 } },
  });
  if (updated.count === 0) throw new Error('No sessions remaining');
  await tx.appointment.create({ data: { /* ... */ }});
});
```

Ce pattern évite deux décréments concurrents au‑delà de 0.

---

## 🟠 Major Issues

1) [AUTHZ] Scoping `organizationId` insuffisant / usage de `findFirst()` générique  
- Ne pas utiliser `findFirst()` pour déterminer l'organisation. Exiger `organizationId` issu de la session et l'injecter dans tous les `where`. Retourner 403 si resource.orgId ne correspond pas.

2) [TRANSACTIONAL LOGIC] Risques lors de changement de package (PUT)  
- L'opération qui décrémente le nouveau package et incrémente l'ancien est fragile. Faire toutes les modifications dans une même transaction atomique et utiliser updateMany pour la décrémentation conditionnelle.

3) [VALIDATION] Pas de schéma de validation formelle (Zod, etc.)  
- Introduire Zod pour définir et valider formellement payloads POST/PUT. Centraliser les erreurs et messages.

4) [DB SCHEMA] Contraintes manquantes (ex. unicité `PackageService`)  
- Ajouter contrainte d'unicité `(packageId, serviceId)` et indexations utiles. Créer migration et backfill si nécessaire.

---

## 🟡 Minor Issues

- Codes d'erreur inconsistant (400/403/409) → standardiser.
- Logs et erreurs : éviter d'exposer stack traces au client ; utiliser logger structuré.
- Typage lâche (`any`) → renforcer types TypeScript.
- Nommage inconsistants (ex. `Note` vs `note`) → harmoniser.
- Shapes de réponse hétérogènes → standardiser API responses.

---

## 🔵 Suggestions opérationnelles

- Ajouter table d'audit `CustomerPackageUsage` (appointmentId, customerPackageId, delta, reason, actorId, timestamp).
- Exposer endpoint admin sécurisé pour créditer/rembourser sessions (outil de réparation).
- UI : afficher `sessionsRemaining` et `expiresAt`; désactiver sélection si expiré ou sessions <= 0.
- Ajout de tests CI couvrant achat→consommation→annulation et test de concurrence (2 requêtes parallèles).
- Script de backfill/détection pour anomalies (sessionsRemaining < 0, incohérences).

---

## 🧩 Plan d'actions priorisées (ordre d'urgence)

1. Critique — appliquer ASAP
   - Implémenter extraction de session/auth et scoper toutes les requêtes par `organizationId`.
   - Corriger la décrémentation atomique (updateMany pattern) et ajouter test de concurrence.

2. Important — ensuite
   - Centraliser la validation d'entrée (Zod).
   - Ajouter tests d'intégration (jest + supertest) pour les flux majeurs (achat→RDV→annulation).
   - Ajouter contrainte d'unicité sur `PackageService` via migration.

3. Moyennement urgent / Nice-to-have
   - Endpoint admin pour crédits/refunds.
   - Audit log à chaque consommation/refund.
   - Améliorations UI pour visibilité des forfaits.

---

## Exemple de correctifs immédiats à appliquer (patches proposés)

A) Auth/session
- Créer `src/lib/auth.ts` (getSessionFromRequest).
- Dans chaque route sensible, exiger session et récupérer `orgId`.

B) Décrémentation atomique
- Remplacer pattern actuel par `updateMany` conditionnel dans une transaction (voir snippet plus haut).
- Gérer erreur et renvoyer 409/400 approprié si plus de sessions.

C) Tests
- Écrire tests d'intégration :
  - Achat → consommation basique (sessionsRemaining décrémente).
  - Refus si package n'inclut pas le service.
  - Concurrence : deux POST simultanés quand sessionsRemaining = 1 → une réussite, une erreur.

---

## 🧮 Décision finale
Verdict: ❌ BLOCK

Raisons : absence d'auth/authz explicite et risque réel d'incohérence métier via décrémentation non atomique. Ces problèmes compromettent la sécurité et l'intégrité des données ; il est nécessaire de corriger ou d'avoir un plan d'atténuation testé avant merger.

---

Si vous voulez que j'implémente les correctifs critiques maintenant, proposez :
- A) Ajouter middleware/getSession minimal et instrumenter `src/app/api/appointments/route.ts`.
- B) Remplacer le bloc transactionnel par le pattern atomic `updateMany` et ajouter tests de concurrence.
- C) A+B

Je peux fournir les patches et tests correspondants prêts à être commités.

