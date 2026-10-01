# Skills du dépôt

Les consignes réutilisables se trouvent à la racine de `skills/`. Les modèles
spécifiques sont regroupés dans `skills/template/`. La liste d’instructions
présentée dans `AGENTS.md` et `CLAUDE.md` est générée par
`scripts/sync_skills.sh`.

## Règles communes

- [Règles globales](global-rules.md) — sécurité, typage, architecture et Git.

## Cycle de développement

- [Builder](builder.skill.md) — implémentation guidée par les spécifications et TDD.
- [Reviewer](reviewer.skill.md) — revue du diff, constats étayés et rapports datés.
- [AutoFixer](auto-fixer.skill.md) — correction des constats confirmés d’une revue.
- [Quality Playbook](quality-playbook.skill.md) — création d’un dispositif qualité adapté au projet.

## Skills spécialisés

- [GitHub Agentic Workflows](agentic-workflow.agent.md) — création et maintenance de workflows `gh-aw`.
- [Draw.io](draw-io-diagram-generator.skill.md) — création et modification de diagrammes `.drawio`.

## Modèles et exemples

- [Blueprint de feature](template/feature-blueprint.skill.md) — structure domaine, persistance, API et tests.
- [Blueprint Playwright](template/playwright-blueprint.md) — exemple de parcours E2E à adapter aux fixtures du projet.
- [Design mobile](template/mobile-design.md) — blueprint validé pour la navigation responsive.
- [Dashboard de performance](template/01-dashboard-performance.md) — spécification de feature, pas un modèle générique.
- [Exemples Draw.io](examples/) — diagrammes d’exemple, sans modèle générique réutilisable.

## Utilisation

Charger `global-rules.md` avec le skill correspondant à la tâche. Les modèles
doivent être adaptés aux conventions et à la configuration réelles du dépôt ;
ils ne remplacent pas les spécifications métier.
