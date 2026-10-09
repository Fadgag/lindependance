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

## 🗂️ Suivi des idées et des bugs
- `AMELIORATIONS.md`, à la racine du dépôt, est la source de vérité pour les nouvelles idées et les bugs. Lorsqu'un utilisateur propose une amélioration ou signale un bug, l'y consigner au lieu de laisser l'information uniquement dans la conversation.
- Avant d'ajouter ou de réorganiser une entrée, lire la liste existante et repérer les sujets proches, les doublons et les dépendances. Compléter l'entrée existante si le signalement concerne le même résultat ; ne pas fusionner des résultats livrables distincts.
- Identifier chaque entrée comme **Amélioration** ou **Bug**, puis la ranger selon l'objectif utilisateur et la surface fonctionnelle concernés. Regrouper les idées qui partagent un parcours ou une dépendance concrète, pas uniquement une technologie.
- Pour une amélioration, décrire le constat, le résultat souhaité et des critères d'acceptation vérifiables. Pour un bug, consigner le comportement observé et attendu, les étapes de reproduction connues, l'impact et les critères permettant de confirmer la correction. Ne pas présenter une hypothèse comme un bug confirmé ; noter les informations manquantes ou l'incertitude.
- Ne pas inclure de secrets ni de données personnelles dans les descriptions ou diagnostics.
- Préserver les priorités et statuts existants. Lorsqu'une mise en œuvre est demandée, traiter uniquement l'entrée ciblée sans embarquer automatiquement les autres idées du thème. Mettre à jour son statut et ne la déclarer réalisée/traitée qu'après vérification de ses critères d'acceptation.
- Lors d'une revue ou d'un travail, inscrire dans `AMELIORATIONS.md` tout finding confirmé qui reste à corriger ou nécessite une décision ; si le finding est corrigé dans la même tâche, mettre à jour l'entrée correspondante après validation.

## 🔍 Revue après développement
- Après toute tâche de développement qui modifie du code ou de la configuration, si le comportement d'un parcours client ou staff change, lancer `skills/quality-guide-updater.skill.md` après les contrôles ciblés initiaux et avant la revue finale.
- Ensuite, lancer `skills/reviewer.skill.md` sur le diff complet avant le compte rendu final. Cette revue est automatique : ne pas attendre une demande `/review`.
- Si le guide updater modifie les guides, les scénarios de campagne ou leur mapping, relancer les tests concernés avant la revue finale. Si aucun parcours manuel n'est affecté, ne pas modifier les guides et documenter brièvement pourquoi.
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
- **Identité GitHub pour `Fadgag/lindependance` :** Toute action attribuée à un compte GitHub dans ce dépôt doit utiliser l'identité `Fadgag` : Issues, commentaires, PR, Project et push. Avant d'agir, vérifier le compte réellement utilisé par l'outil ; `GH_TOKEN` ou l'authentification propre à un outil peut primer sur le compte actif de `gh`. Ne pas créer ou publier sous une autre identité en silence. Si l'outil ne permet pas d'utiliser `Fadgag`, expliquer la limite et demander comment procéder.
- **Identité des commits :** Un push authentifié comme `Fadgag` ne change pas l'auteur du commit. Avant de créer un commit pour ce dépôt, vérifier que `user.name` et `user.email` sont l'identité configurée et vérifiée de `Fadgag`. Si elle n'est pas disponible, demander à l'utilisateur plutôt que d'utiliser une autre identité ou d'inventer une adresse.
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