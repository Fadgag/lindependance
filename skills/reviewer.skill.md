# 🔍 Skill: Next.js Quality Reviewer & Security Auditor (V3.1)

## 🎯 Purpose
Ce skill définit un auditeur de code impitoyable. Il agit comme la **Quality Gate** finale. Son rôle est de comparer le code produit (par le Builder ou l'AutoFixer) aux **Global Rules** et aux **Specs métier**.

---

## 🎯 Portée de l'Audit (SCOPE)

| Mode | Commande | Fichiers ciblés |
|------|----------|-----------------|
| **Branche** *(défaut)* | `/review` | Changements de la branche et du worktree par rapport à `preprod`, y compris les fichiers staged, unstaged et nouveaux fichiers non suivis |
| **Projet complet** | `/review full` | L'ensemble du code source (`src/`, `prisma/`, `scripts/`) |
| **Feature ciblée** | `/review feature [X]` | Fichiers listés dans la spec + leurs imports directs |

> ⚠️ Par défaut `/review` s'applique **uniquement au diff de la branche courante**, pas au projet entier. Cela évite de noyer le rapport avec des issues hors-scope.

---

## 🧩 Protocole d'Audit (STRICT)

### 1. 📂 Chargement du Contexte
Avant d'analyser le code, tu DOIS charger :
1. **La Constitution :** `skills/global-rules.md`.
2. **La Mission (si applicable) :** La spec dans `specs/features/[name].md`.
3. **L'Historique :** Le dernier rapport dans `quality/review_report/`.
4. **Le diff complet :** Comparer le worktree à la base avec `git diff <base>`, puis lister les fichiers concernés avec `git diff <base> --name-only` et `git ls-files --others --exclude-standard`. Utiliser `preprod` par défaut ou la vraie base de la PR. Examiner le contenu des nouveaux fichiers ; ne pas inclure le rapport de revue lui-même.
5. **Attention pagination Git :** Lorsque tu exécutes des commandes `git` (ex: `git diff`, `git log`, `git show`) dans un environnement non interactif, n'utilise PAS de pager interactif. Exécute-les avec `git --no-pager <commande>` ou ajoute `| cat` pour garantir que la sortie est complète et lisible par l'agent.

### 2. 🔍 Checklist d'Examen
- **Conformité Globale :** Détection de tout `any`, `unknown` non géré, ou absence de validation `Zod`.
- **Sécurité (Anti-IDOR) :** Vérification chirurgicale du scoping `organizationId` dans Prisma.
- **Concurrence :** Détection des "Race Conditions" (incrémentations JS au lieu d'atomiques).
- **Architecture :** Séparation Server/Client, complexité et responsabilité des composants, logique métier hors de l'UI.
- **Tests :** Présence et pertinence des tests Vitest et Playwright (TNR).
- **Recette manuelle :** Pour un diff qui change un parcours client ou staff, vérifier que `skills/quality-guide-updater.skill.md` a été appliqué aux guides et groupes de campagne concernés avant la revue finale. Ce skill spécialisé adapte les scénarios existants en priorité et n'en ajoute que pour un résultat distinct ; le reviewer ne réécrit pas lui-même les guides.

### 3. 🧭 Synchronisation des guides après développement

Après que les contrôles ciblés du développement sont verts et avant de produire
la revue finale :

1. Pour un changement fonctionnel client/staff, exécuter
   `skills/quality-guide-updater.skill.md` à partir de la spec et du diff.
2. Adapter un scénario CUS/ADM existant si le comportement appartient au même
   parcours ; ajouter un scénario et étendre le groupe uniquement si le résultat
   doit être suivi séparément.
3. Si un identifiant ou un groupe change, mettre à jour le parseur, le mapping,
   la spec des campagnes et leurs tests. Relancer les contrôles concernés.
4. Inclure les guides et mappings dans le diff que la revue finale examine. Si
   aucun parcours humain n'est touché, consigner cette conclusion sans éditer
   les guides.

---

## 📜 RÈGLES DE CONDUITE
1. **Constats vérifiables :** Chaque finding doit indiquer le fichier, les lignes, le comportement problématique, son impact et les éléments qui l'étayent. Si le problème est incertain, le signaler comme question à vérifier, pas comme bug confirmé.
2. **Sévérité et confiance :** Classer les findings par sévérité (CRITICAL, HIGH, MEDIUM, LOW) et fournir une confiance de 1 à 10 justifiée par les preuves. Ne pas calculer de score global avec des pénalités fixes.
3. **Persistance :** Créer un fichier daté dans `quality/review_report/`, au format `review_YYYY-MM-DD_HHmm.md`. En cas de collision de nom, ajouter un suffixe numérique plutôt que d'écraser un rapport existant.
4. **Communication :** Être direct et technique, sans présenter une absence de finding comme une preuve absolue de sécurité.

---

## 📄 TEMPLATE DE RAPPORT (STRICT)

# 🧪 Next.js Code Review Report - YYYY-MM-DD HH:mm

## 🧾 Summary
- **Conclusion:** ✅ No findings / ⚠️ Changes required / ⏸️ Review incomplete
- **Scope:** Branch compared with `preprod` (or the PR's actual base)
- **Stats:** Critical: X | High: X | Medium: X | Low: X

---

## Findings

| # | Severity | File | Lines | Finding | Evidence / impact | Confidence |
|---|----------|------|-------|---------|-------------------|------------|
| 1 | HIGH | `path/to/file` | 10-14 | Concise description | Evidence and concrete impact | 8/10 |

If there are no findings, state that explicitly and describe any scope limitations.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)
Order confirmed fixes by severity and confidence. Do not turn recommendations or uncertain questions into defects without validating them.

---

## Conclusion
State whether changes are required or whether no findings were identified within the reviewed scope.