---
id: claude.send-weekly-report
name: "Envoyer rapport hebdomadaire"
description: "Prépare et envoie automatiquement le rapport hebdomadaire par e-mail."
version: "1.0.0"
triggers:
  - "envoyer le rapport hebdomadaire"
  - type: "regex"
    pattern: "(rapport|report).*hebdomadaire"
preconditions:
  authenticated: true
  has_permission: "send_email"
actions:
  - type: "compose_email"
    params:
      to: "team@example.com"
      subject: "Rapport hebdomadaire"
      body_template: "templates/weekly_report.md"
  - type: "call_api"
    params:
      url: "https://internal.example.com/reports/compile"
      method: "POST"
      timeout_seconds: 30
  - type: "reply"
    params:
      text: "Le rapport hebdomadaire a été préparé et envoyé."
examples:
  - "Peux-tu envoyer le rapport hebdomadaire ?"
  - "Prépare et envoie le report hebdomadaire au team"
tags:
  - "report"
  - "email"
---

# Envoyer rapport hebdomadaire

Ce skill prépare et envoie un rapport hebdomadaire à l'équipe. Il peut être déclenché par les phrases listées dans le frontmatter (`triggers`) ou lorsqu'on demande explicitement l'envoi d'un rapport.

Usage rapide

- Déclencheurs : "envoyer le rapport hebdomadaire", "Prépare et envoie le report hebdomadaire au team"
- Préconditions : l'agent doit être authentifié et disposer de la permission `send_email`.
- Actions réalisées : composition d'un e-mail (template), appel d'une API interne pour compiler le rapport, puis confirmation à l'utilisateur.

Exemples d'invite (prompts)

- "Peux-tu envoyer le rapport hebdomadaire ?"
- "Prépare et envoie le rapport hebdomadaire au team et indique le nombre de points traités."

Notes

- Ne pas stocker de secrets (tokens API, mots de passe) directement dans ce fichier. Utiliser des variables d'environnement ou un store sécurisé.
- Le chemin `templates/weekly_report.md` doit exister dans le dépôt si vous voulez utiliser le `body_template` tel quel.

