📂 Fichier : skills/README.mdMarkdown# 🧠 Système d'Agents & Skills (V2.0)

Ce dépôt utilise une architecture d'**Agents IA** pilotés par des **Skills** (fichiers Markdown) pour garantir une qualité de code constante, une sécurité maximale (Anti-IDOR) et un typage strict.

---

## 🏗️ Architecture du Workflow

Le développement suit un cycle circulaire appelé le **"Golden Loop"** :

1.  **LA MISSION (`/builder`)** : L'agent **Builder** transforme une spec (`specs/features/`) en code via un protocole **TDD** (Test -> Service -> API -> UI).
2.  **L'AUDIT (`/review`)** : L'agent **Reviewer** compare le code aux règles globales et génère un rapport de santé (`quality/review_report/`).
3.  **LA CORRECTION (`/autofixer`)** : L'agent **AutoFixer** répare les erreurs du rapport sans jamais modifier les tests initiaux.

---

## 🛠️ Organisation des Dossiers

* **`global-rules.md`** : **La Constitution.** Règles non-négociables s'appliquant à TOUS les agents (Zéro `any`, Scoping Prisma, Zod).
* **`agents/`** : Contient les manuels de bord spécifiques à chaque rôle.
  * `builder.skill.md` : Protocole de construction TDD.
  * `reviewer.skill.md` : Protocole d'audit et scoring.
  * `AutoFixer.skill.md` : Protocole de réparation chirurgicale.
* **`shared/`** : Skills utilitaires (ex: `send-weekly-report.skill.md`).

---

## 📜 Conventions & Standards

### 1. Nommage
- Fichiers : `kebab-case.skill.md` (ex: `feature-builder.skill.md`).
- Identifiants : `id: agent.nom-du-skill` dans le frontmatter.

### 2. Structure d'un Skill (`.md`)
Chaque nouveau skill doit suivre ce schéma :
```markdown
---
id: agent.nom-du-skill
name: Nom Lisible
version: 1.x
---
# 🎯 Purpose
Rôle de l'agent et objectifs principaux.

## 🛠️ Protocole (STRICT)
Liste numérotée des étapes d'exécution.

## 🛡️ Règles Spécifiques
Contraintes métier ou interdictions techniques.
🌍 Global Rules (Rappel Critique)Avant toute action, l'agent doit charger skills/global-rules.md.Les piliers sont :❌ Zéro any ou unknown (Typage strict obligatoire).🛡️ Anti-IDOR : Toute requête Prisma doit inclure organizationId.✅ Zod : Validation systématique des inputs request.json().🧪 Intégrité : Interdiction de modifier les tests pour faire passer le code.🚀 Commandes RapidesCommandeActionAgent/builder feature [nom]Implémente une spec de specs/features/Builder/reviewAnalyse le code et génère un rapport review_V[N].mdReviewer/autofixerCorrige les bugs 🔴 et 🟠 du dernier rapportAutoFixer🔄 Migration & ÉvolutionPour convertir un ancien skill .yaml en .md :Encapsuler le contenu YAML entre des balises --- (frontmatter).Ajouter une section # Documentation en dessous pour détailler le comportement attendu.Supprimer l'ancien fichier .yaml une fois la validation effectuée.