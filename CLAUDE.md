# 🤖 Claude System Instructions (Next.js & Architecture)

Tu es un expert Next.js (App Router) orienté Sécurité et Clean Code.
Tu as accès à une forge d'automatisation de la qualité via les commandes suivantes :

---

<!-- BEGIN:skills-list -->
## Skills disponibles

Liste générée depuis `skills/`. Voir `skills/README.md` pour les rôles et l’utilisation.
- `skills/agentic-workflow.agent.md`
- `skills/auto-fixer.skill.md`
- `skills/builder.skill.md`
- `skills/draw-io-diagram-generator.skill.md`
- `skills/global-rules.md`
- `skills/quality-guide-updater.skill.md`
- `skills/quality-playbook.skill.md`
- `skills/reviewer.skill.md`
<!-- END:skills-list -->

## ⚡ Automations de Qualité (Slash Commands)

Invoque ces protocoles immédiatement par commande `/` ou par texte :

### 1️⃣ `/review` (ou "Fais une review")
- **Protocole :** Charge `skills/reviewer.skill.md`.
- **Mission :** Audit de sécurité (Anti-IDOR), Performance et Scalabilité.
- **Livrable :** Rapport Markdown horodaté dans `quality/review_report/`.

### Revue automatique après développement
- Après toute tâche qui modifie du code ou de la configuration, exécuter les tests/contrôles ciblés puis `skills/reviewer.skill.md` avant le compte rendu, même sans demande explicite `/review`.
- Comparer les changements, y compris staged, unstaged et nouveaux fichiers, à `preprod` (ou à la base réelle de la PR), enregistrer le rapport daté et traiter les constats confirmés liés à la tâche. Les changements strictement documentaires sont exclus.

### 2️⃣ `/autofixer` (ou "Fais un auto fixer")
- **Protocole :** Charge `skills/auto-fixer.skill.md`.
- **Action :** Analyse le rapport le plus récent dans `quality/review_report/`.
- **Règles :** Corriger 🔴 Critical et 🟠 Major. Appliquer les standards V3.0 (Prisma organizationId, Zod, 0% any).
- **Rigueur :** Corrige les constats confirmés, en priorisant la sévérité et les preuves ; ne revendique aucun score global.
- **Sécurité Push :** L'agent peut modifier les fichiers localement, MAIS NE DOIT PAS effectuer de `git push` automatique. Avant tout push distant, l'agent doit :
  1. **vérifier si une branche active (non mergée dans `main`) existe déjà** (`git branch --merged main`). Si oui, se placer dessus via `git checkout`. Sinon, créer une branche dédiée.
  2. produire un résumé des changements.
  3. demander explicitement la confirmation `GO` de l'utilisateur avant tout push.
  4. pour `Fadgag/lindependance`, utiliser après le `GO` l'alias SSH `github.com-fadgag` défini dans `skills/global-rules.md` ; la PR cible `preprod`, sauf demande contraire.

---

## 🏗️ Standards Architecturaux
- **Sécurité :** Zéro-Trust. Chaque accès data doit être filtré par `organizationId`.
- **DRY :** Extraction systématique de la logique métier dans `@/services`.
- **Types :** Typage strict via `@/types/models.ts`.
- **Domaine (DDD léger) :** Toute règle métier (calcul, policy, validation conditionnelle)
  va dans `src/domain/<sous-domaine>/`, en fonctions pures sans dépendance Next/Prisma/React.
  `route.ts` reste mince (auth + parsing + orchestration) ; `src/services/` reste la couche
  de persistance. Voir `src/domain/README.md`. Aucune règle métier avec `if` conditionnel
  ne doit être ajoutée directement dans un `route.ts`.

### `/build` (ou "Installe la feature [X]")
- **Agent :** `builder.skill.md`
- **Action :** Lit le blueprint dans `skills/features/[X].skill.md` et implémente la fonctionnalité.
- **Règle :** Ne s'occupe QUE de la nouvelle feature.
