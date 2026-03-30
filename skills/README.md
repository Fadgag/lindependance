Skills
======

Emplacement
-----------
Les skills sont stockés dans `skills/` à la racine du dépôt.

Structure recommandée
---------------------
- skills/
  - agents/
    - claude/
    - <other-agent>/
  - shared/

Convention de nommage
---------------------
Fichiers: `kebab-case.skill.yaml` (ex: `send-weekly-report.skill.yaml`).

Schéma minimal (YAML)
---------------------
Champs recommandés:
- id: identifiant unique (ex: `claude.send-weekly-report`)
- name: nom lisible
- description: courte description
- version: version du skill (optionnel mais recommandé)
- triggers: liste de triggers (texte ou regex)
- preconditions: conditions avant exécution (optionnel)
- actions: liste d'actions (type + params)
- examples: exemples d'utilisation
- tags: liste de tags (optionnel)

Ajout et validation
-------------------
- Créer le fichier YAML dans le dossier approprié.
- Référencer le chemin du fichier dans `AGENTS.md` ou `CLAUDE.md`.
- Vérifier la présence des champs obligatoires avec les commandes fournies dans le plan.

Bonnes pratiques
----------------
- Petite portée: 1 tâche par skill
- Pas de secrets en clair
- Fournir exemples et préconditions
- Mettre `version` et `id` unique


