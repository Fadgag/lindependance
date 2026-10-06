# 🌍 Global Coding Standards (Universal)

Toute modification de code effectuée par un agent (Builder, AutoFixer, ou autre) DOIT respecter ces règles.

## 🛑 Règle d'Or : Type Safety (Zéro Compromis)
- **Interdiction du `any` :** L'usage de `any` est strictement interdit. Si un type est complexe, utilise les types générés par Prisma ou crée une interface dédiée dans `@/types/`.
- **Interdiction du `unknown` :** Sauf pour la capture d'erreurs (`catch (err: unknown)`), le type `unknown` doit être réduit (narrowing) immédiatement via un type guard ou un schéma Zod.
- **Type Casting :** Le mot-clé `as` ne doit être utilisé qu'en dernier recours et doit être documenté par un commentaire `// RAISON: ...`.

## 🛡️ Sécurité & Data Isolation
- **Organization Scoping :** Aucune donnée ne doit être lue ou écrite sans vérifier l'appartenance à `session.organizationId`.
- **Zod Validation :** Toute donnée provenant de l'extérieur (API Request, SearchParams) doit être validée par un schéma Zod avant traitement.

## 🧪 Intégrité des Tests
- **Non-Régression :** Aucun agent n'a le droit de modifier un test existant pour faire passer son code. Si un test échoue, le code source doit être corrigé, pas le test.
- **Atomicité :** Les opérations sur les compteurs ou les stocks doivent utiliser des transactions Prisma ou des opérations atomiques.

## 🗣️ Langage des campagnes de recette
- Pour les scénarios **CUS** destinés aux clients et **ADM** destinés aux gérants de salon, écrire les titres, étapes, résultats attendus et libellés de la checklist en français simple, concret et naturel pour un public non technique. Décrire ce que la personne doit faire et ce qu'elle devrait constater ; éviter le jargon informatique et métier inutile.
- Ne pas afficher aux testeurs les identifiants internes `CUS-*` / `ADM-*`, les priorités `P0` / `P1` / `P2`, ni les autres détails techniques de suivi. Les conserver dans les données et outils internes lorsque nécessaires au suivi.
- Le code, les API, les tests, les rapports et les explications destinés à l'équipe technique peuvent rester techniques. Adapter le niveau de langage au public visé sans simplifier ni masquer les informations techniques utiles aux développeurs.

## 🗂️ Classement des idées d'amélioration
- Avant d'ajouter ou de réorganiser une idée dans `AMELIORATIONS.md`, lire la liste existante et repérer les sujets proches, les doublons et les dépendances.
- Ranger chaque idée sous le thème ou le chantier qui correspond à son objectif utilisateur et à sa surface fonctionnelle. Regrouper les sujets pouvant avancer ensemble lorsqu'ils partagent un parcours, une configuration ou une dépendance concrète ; ne pas les rapprocher uniquement parce qu'ils utilisent la même technologie.
- Un regroupement sert à planifier : conserver une entrée, un statut et des critères d'acceptation distincts pour chaque résultat livrable. Préciser les sous-chantiers ou dépendances lorsqu'un lot n'est pas entièrement indivisible.
- Préserver les priorités et statuts existants ; ne déclarer une amélioration réalisée qu'après vérification de ses critères d'acceptation. Lorsqu'une mise en œuvre est demandée, cadrer le lot utile sans embarquer automatiquement les autres idées du même thème.

## 🔍 Revue après développement
- Après toute tâche de développement qui modifie du code ou de la configuration, lancer `skills/reviewer.skill.md` une fois les tests et contrôles ciblés terminés, avant le compte rendu final. Cette revue est automatique : ne pas attendre une demande `/review`.
- Examiner le diff complet de la branche par rapport à `preprod` (ou à la base réelle de la PR), en incluant les modifications staged, unstaged et les nouveaux fichiers non suivis. Exclure le rapport de revue lui-même. Les tâches strictement documentaires ne nécessitent pas cette revue automatique.
- Enregistrer le rapport daté dans `quality/review_report/`. Corriger dans la tâche les constats confirmés liés aux changements effectués, relancer les contrôles et la revue ; signaler séparément tout constat hors périmètre ou nécessitant une décision.

## 🧹 Propreté du Code
- **Pas de Logs de Debug :** Supprimer tous les `console.log` avant de finaliser.
- **Imports :** Nettoyer les imports inutilisés (`pnpm lint --fix`).
- 
## 🔒 Git & Push Policy
- **Jamais de push direct sur `main` :** Il est strictement interdit de pousser directement sur la branche `main` (ou `master`). Tout correctif ou feature DOIT passer par une branche dédiée et une Pull Request.
- **Réutilisation de branche (règle prioritaire) :** Avant de créer une nouvelle branche, l'agent DOIT vérifier si une branche active (non encore mergée dans `main`) existe déjà pour la tâche en cours :
  1. Exécuter `git branch --merged main` pour identifier les branches déjà mergées.
  2. Si une branche non-mergée pertinente existe (ex: `fix/xxx` ou `feature/xxx` en cours), **se placer dessus** via `git checkout <branche>` au lieu d'en créer une nouvelle.
  3. Ne créer une nouvelle branche que si aucune branche active pertinente n'existe.
  4. Règle mnémotechnique : **une tâche = une branche, jusqu'au merge**.
- **Pas de push automatique :** Aucun agent ne doit effectuer de `git push` vers un remote sans confirmation explicite de l'utilisateur. Les étapes minimales avant push sont :
  1. vérifier/réutiliser la branche existante (voir règle ci-dessus),
  2. produire un résumé des changements (changelog),
  3. demander la validation humaine `GO` avant d'exécuter `git push`.
- **Push GitHub de `Fadgag/lindependance` :** utiliser l'alias SSH `github.com-fadgag` défini dans le `~/.ssh/config` local, plutôt que `origin` en HTTPS, qui peut sélectionner le mauvais compte. Vérifier l'identité avec `ssh -T git@github.com-fadgag` ; le message attendu est `Hi Fadgag!` (GitHub peut terminer cette vérification avec un code de sortie non nul). Après le `GO`, pousser la branche explicitement sans changer la configuration du remote :
  ```bash
  git push -u git@github.com-fadgag:Fadgag/lindependance.git <branche>
  ```
  Remplacer `<branche>` par la branche courante. Les PR de ce dépôt doivent cibler `preprod`, sauf demande contraire de l'utilisateur.
 - **Ne pas utiliser la pagination pour les commandes Git quand la sortie n'est pas visible :**
   - Les agents DOIVENT exécuter les commandes `git` sans pagination (par ex. `git --no-pager <commande>` ou en ajoutant `| cat`) si la sortie ne peut pas être consultée dans la console. Ceci évite des résultats tronqués ou suspendus par un pager (less, more) et garantit que l'agent peut analyser la sortie immédiatement.
   - Ne jamais dépendre d'un pager interactif pour prendre des décisions automatiques.
- **Branche protégée :** `main` est la branche de production. Un merge sans PR et sans review est interdit même pour un "petit fix".
  
## 🛡️ Proxy & Sécurité (Nouveau Standard Next.js 2026)
- **Convention :** `middleware.ts` est proscrit pour ce projet. Utiliser `proxy.ts` à la racine, après vérification des conventions de la version Next.js installée.
- **Rôle du Proxy :** 1. Intercepter la session.
    2. Injecter les headers `x-org-id` de manière immuable.
    3. Valider l'authentification avant d'atteindre les Server Components.
- **Interdiction :** Ne jamais implémenter de logique de redirection complexe dans le code métier si elle peut être gérée au niveau du `proxy.ts`.

## 🏗️ Architecture métier
- Les règles métier (calculs, politiques et validations conditionnelles) résident dans `src/domain/<sous-domaine>/` sous forme de fonctions pures, sans dépendance à Next.js, Prisma ou React.
- Les services dans `src/services/` portent la persistance Prisma ; ils sont appelés après validation par le domaine.
- Les routes `src/app/api/**/route.ts` restent limitées à l'authentification, au parsing/validation Zod et à l'orchestration. Elles ne contiennent pas de règles métier conditionnelles.