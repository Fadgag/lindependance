# This is NOT the Next.js you know
This version has breaking changes. Read `node_modules/next/dist/docs/` before writing code.

<!-- BEGIN:skills-list -->
## Skills disponibles

Liste générée depuis `skills/`. Voir `skills/README.md` pour les rôles et l’utilisation.
- `skills/agentic-workflow.agent.md`
- `skills/auto-fixer.skill.md`
- `skills/builder.skill.md`
- `skills/draw-io-diagram-generator.skill.md`
- `skills/global-rules.md`
- `skills/quality-playbook.skill.md`
- `skills/reviewer.skill.md`
<!-- END:skills-list -->

## 📋 Instructions Générales
Avant toute action, l'agent doit charger et respecter :
1. **Global Rules :** `skills/global-rules.md` (Standards de qualité et sécurité).
2. **Agent Skill :** Le skill spécifique à la tâche (Builder, AutoFixer, Reviewer).
3. **Task Context :** La spec (`specs/features/`) ou le rapport de review.

Note: Les fichiers de skills sont stockés dans le répertoire `skills/` à la racine du projet. Pour régénérer automatiquement la liste des skills dans `AGENTS.md` et `CLAUDE.md`, utilisez le script `scripts/sync_skills.sh` (il met à jour les sections entre marqueurs dans ces fichiers).

## 🏗️ Convention d'architecture (DDD léger)
- Toute règle métier (calcul, policy, validation conditionnelle) va dans `src/domain/<sous-domaine>/`,
  en fonctions pures sans dépendance Next.js/Prisma/React (voir `src/domain/README.md`).
- `src/app/api/**/route.ts` reste mince : auth, parsing Zod, orchestration — aucune règle
  métier conditionnelle directe.
- `src/services/` reste la couche de persistance (accès Prisma), appelée après validation
  par le domaine.
- Tests du domaine dans `test/domain/**/*.spec.ts`, sans mock Prisma.


## ⚡ Commandes de Qualité (Qualité & Sécurité)

Dès qu'une commande est invoquée (via `/` ou par texte), exécute le protocole technique associé sans poser de questions :

### `/review` (ou "Fais une review")
- **Skill :** `reviewer.skill.md`
- **Action :** Audit de sécurité (Anti-IDOR), Performance et Clean Code.
- **Sortie :** Génère un rapport daté dans `quality/review_report/`.

### Revue automatique après développement
- Après toute tâche qui modifie du code ou de la configuration, exécuter les tests/contrôles ciblés puis `skills/reviewer.skill.md` avant le compte rendu, même sans demande explicite `/review`.
- Comparer les changements, y compris staged, unstaged et nouveaux fichiers, à `preprod` (ou à la base réelle de la PR), enregistrer le rapport daté et traiter les constats confirmés liés à la tâche. Les changements strictement documentaires sont exclus.

### `/autofixer` (ou "Fais un auto fixer")
- **Skill :** `skills/auto-fixer.skill.md`
- **Cible :** Analyse le rapport le plus récent dans `quality/review_report/`.
- **Règles :** Priorité Sécurité > DRY > Types. Applique les correctifs directement dans le code source (0% `any`, check `organizationId` Prisma, validation `zod`).
- **Push & Branching :** L'agent PEUT modifier le code localement, mais NE DOIT PAS pousser automatiquement sur un remote. Avant tout push vers un dépôt distant l'agent doit :
  1. **vérifier si une branche active (non mergée dans `main`) existe déjà** pour la tâche (`git branch --merged main`). Si oui, se placer dessus. Sinon, créer une branche dédiée (ex: `feature/xxx` ou `fix/yyy`).
  2. générer un résumé des changements et demander explicitement la confirmation humaine `GO` pour effectuer le `git push`.
  3. ne pas pousser sans l'accord explicite de l'utilisateur.
  4. pour `Fadgag/lindependance`, après le `GO`, utiliser l'alias SSH `github.com-fadgag` comme indiqué dans `skills/global-rules.md` ; la PR cible `preprod`, sauf demande contraire.

### `/builder feature [name]`
- **Rôle :** Active le Skill `skills/builder.skill.md`.
- **Action :** 1. Localise le fichier `specs/features/[name].md`.
    2. Analyse le besoin fonctionnel.
    3. Applique le protocole TDD (Test -> Code -> UI).
- **Contrainte :** Ne pas commencer sans avoir confirmé la lecture de la spec et du protocole TDD.

---
