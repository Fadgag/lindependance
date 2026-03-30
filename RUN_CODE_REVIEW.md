# RUN_CODE_REVIEW: Forfaits & Appointments

But
- Fournir une procédure reproductible pour exécuter la revue ciblée et valider les corrections.

Étapes rapides
1. Lire `QUALITY.md` pour comprendre les scénarios et priorités.
2. Exécuter les tests d'API et d'intégration (voir `quality/README.md`).
3. Lancer le script e2e curl dans `quality/e2e_purchase_consume.sh` contre une instance locale (dev) qui utilise la DB de dev (sqlite). Le script crée un client, achète un forfait, crée 2 requêtes parallèles si demandé et vérifie les effets.
4. Vérifier le code pour scoping `organizationId` et transactions où sessionsRemaining est modifié.

Critères d'acceptation
- Tous les scénarios S1–S6 définis dans `QUALITY.md` ont des tests automatiques (ou manuels documentés) et passent localement.
- Les points critiques (transactional decrement + ownership checks) sont appliqués ou un plan de migration est présent.

Notes
- Le script curl est un outil d'investigation / smoke tests, il ne remplace pas les tests d'intégration automatisés qui doivent être ajoutés au pipeline CI.

