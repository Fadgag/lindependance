# Skill : Mise à jour des guides de recette

## Rôle

Synchroniser les guides de recette bêta avec les comportements réellement
livrés. Ce skill est exécuté après l'implémentation d'un changement fonctionnel,
une fois que les contrôles ciblés du code passent, et avant la revue finale.
Il ne remplace ni les tests automatisés ni l'approbation humaine de la recette.

## Contexte obligatoire

Lire avant toute modification :

1. `skills/global-rules.md`.
2. La spec de la fonctionnalité ou l'entrée correspondante dans
   `AMELIORATIONS.md`.
3. Les guides existants `quality/recette-beta-customer.md` et
   `quality/recette-beta-admin.md`.
4. La définition des profils et groupes dans
   `src/domain/test-feedback/scenarios.ts` et
   `src/domain/test-feedback/scenarioGroups.ts`, ainsi que
   `specs/features/tester-feedback.md`.
5. Le diff et les tests qui prouvent le comportement livré.

## Décider entre adapter et ajouter

- Adapter un scénario existant lorsque le nouveau comportement complète le
  même parcours, le même profil et le même résultat vérifiable. Préserver son
  identifiant et élargir ses étapes/résultats attendus sans mélanger des tâches
  indépendantes.
- Ajouter un scénario distinct lorsqu'un autre acteur, un autre parcours ou un
  résultat qui doit être suivi séparément est nécessaire. Prendre le prochain
  identifiant libre du profil concerné et conserver les identifiants existants.
- Ne créer un nouveau groupe de campagne que si le parcours ne correspond à
  aucun groupe existant. Une nouvelle catégorie implique la mise à jour du
  schéma des groupes, de leurs plages, des filtres, de la spec campagne et des
  tests de synchronisation.
- Dans le système actuel, `USER` désigne le client et `ADMIN` désigne le
  membre du personnel/admin du salon. Ne pas inventer un profil `STAFF`
  distinct sans décision produit et évolution de `TestProfile`.

## Règles de rédaction et de vérification

- Écrire pour la personne qui teste : français simple, actions concrètes et
  résultat observable. Ne pas afficher dans la checklist publique les
  identifiants internes `CUS-*` / `ADM-*`, les priorités ni les détails
  techniques ; le parseur de campagne doit continuer à les retirer.
- Ajouter les prérequis de données de test sous forme d'alias, jamais de
  comptes réels, mots de passe, codes OTP, adresses personnelles ou secrets.
- Relier chaque scénario à la spec pertinente et distinguer clairement la
  vérification manuelle bêta des tests automatisés. Ne jamais prétendre qu'un
  test mocké valide un fournisseur externe ou un parcours navigateur réel.
- Vérifier que chaque scénario de guide est parsé avec le bon profil et inclus
  exactement dans le groupe de campagne attendu. Mettre à jour les plages de
  `scenarioGroups.ts`, les références dans les specs et les tests si un nouvel
  identifiant est ajouté.
- Si le changement ne modifie aucun parcours vérifiable par une personne,
  ne pas toucher aux guides ; expliquer brièvement pourquoi.

## Sortie attendue

Indiquer les guides, specs et mappings modifiés, les scénarios adaptés/ajoutés,
les contrôles effectués et les parcours manuels qui restent à vérifier en bêta.
