# This is NOT the Next.js you know
This version has breaking changes. Read `node_modules/next/dist/docs/` before writing code.

## Skills disponibles
- `skills/agentic-workflow.agent.md`
- `skills/taxe-core-technical-writer.agend.md`
- `skills/quality-playbook.skill.md`
- `skills/draw-io-diagram-generator.skill.md`
- `skills/send-weekly-report.skill.md`
- `skills/reviewer.skill.md`
- `skills/auto-fixer.skill.md`  # actual filename uses kebab-case
- `skills/builder.skill.md`
- `skills/global-rules.md`

## 📋 Instructions Générales
Avant toute action, l'agent doit charger et respecter :
1. **Global Rules :** `skills/global-rules.md` (Standards de qualité et sécurité).
2. **Agent Skill :** Le skill spécifique à la tâche (Builder, AutoFixer, Reviewer).
3. **Task Context :** La spec (`specs/features/`) ou le rapport de review.

Note: Les fichiers de skills sont stockés dans le répertoire `skills/` à la racine du projet. Pour régénérer automatiquement la liste des skills dans `AGENTS.md` et `CLAUDE.md`, utilisez le script `scripts/sync_skills.sh` (il met à jour les sections entre marqueurs dans ces fichiers).


## ⚡ Commandes de Qualité (Qualité & Sécurité)

Dès qu'une commande est invoquée (via `/` ou par texte), exécute le protocole technique associé sans poser de questions :

### `/review` (ou "Fais une review")
- **Skill :** `reviewer.skill.md`
- **Action :** Audit de sécurité (Anti-IDOR), Performance et Clean Code.
- **Sortie :** Génère un rapport daté dans `quality/review_report/`.

### `/autofixer` (ou "Fais un auto fixer")
- **Skill :** `AutoFixer.skill.md`
- **Cible :** Analyse le rapport le plus récent dans `quality/review_report/`.
- **Règles :** Priorité Sécurité > DRY > Types. Applique les correctifs directement dans le code source (0% `any`, check `organizationId` Prisma, validation `zod`).

### `/builder feature [name]`
- **Rôle :** Active le Skill `skills/builder.skill.md`.
- **Action :** 1. Localise le fichier `specs/features/[name].md`.
    2. Analyse le besoin fonctionnel.
    3. Applique le protocole TDD (Test -> Code -> UI).
- **Contrainte :** Ne pas commencer sans avoir confirmé la lecture de la spec et du protocole TDD.

---