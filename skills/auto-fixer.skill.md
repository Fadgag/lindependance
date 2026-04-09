# 🔧 Skill: Next.js Auto-Fixer "Senior" (V1.3 - Precision & Compliance)

## 🎯 Purpose
Ce skill transforme les rapports de review en correctifs réels. Son rôle est de restaurer la santé du code sans jamais compromettre les standards définis dans les `Global Rules`.

---

## 🛠️ MÉTHODOLOGIE DE RÉPARATION (STRICT)

### 1. 📖 Analyse & Mapping
- **Input :** Analyser le fichier le plus récent dans `quality/review_report/`.
- **Scope :** Identifier chaque fichier lié à une erreur 🔴 (Critique) ou 🟠 (Majeure).
- **Standards :** Charger `skills/global-rules.md` pour garantir que le fix respecte le Zéro-Any, l'Anti-IDOR et la gestion d'erreurs Zod.

### 2. 🧪 Protocole TDD de Correction
Pour chaque bug ou faille identifiée :
1. **Validation du Test :** Exécuter la suite de tests existante (`vitest`).
2. **Identification du "Red" :** Si aucun test ne capture le bug, créer un test de régression temporaire pour isoler la faille.
3. **Application du Patch :** Modifier le code source en utilisant les patterns atomiques (transactions Prisma) et sécurisés (scoping organizationId).
4. **Validation "Green" :** Le fix est validé uniquement si tous les tests passent sans avoir modifié la logique des tests existants.

---

## 🛡️ RÈGLES D'INTÉGRITÉ (INVIOLABLES)

- **Immuabilité des Tests :** Interdiction de modifier la logique des fichiers `.test.ts` ou `.spec.ts` pour faire passer un correctif. Le code doit s'adapter au test, pas l'inverse.
- **Conformité Globale :** Appliquer systématiquement les directives de `skills/global-rules.md` (Type safety, Error masking, Scoping).
- **Arbitrage Humain :** Si un correctif de sécurité rend un test fonctionnel impossible à passer (conflit de logique), stopper l'exécution et demander une validation.

---

## 📤 OUTPUT FORMAT (Journal de bord)

Pour chaque fichier traité, lister :
- **✅ [FILE_PATH]** : Description du fix (ex: "Passage en transaction atomique Prisma").
- **🧪 [TEST_STATUS]** : Confirmation du passage au vert (Unit & E2E).
- **⚠️ [ALERT]** : Si une intervention humaine est requise (ex: changement de schéma DB nécessaire).

---

## 🏁 CONDITION DE SORTIE (DEFINITION OF DONE)
Un cycle d'AutoFix n'est terminé que si :
1. ✅ **Vitest :** 100% de succès sur les tests unitaires.
2. ✅ **Playwright :** 100% de succès sur les TNR (Tests de Non-Régression).
3. ✅ **Lint & Type-check :** Aucune erreur TypeScript ou ESLint détectée.
4. ❌ **No Cheat :** Aucun test existant n'a été altéré ou supprimé.