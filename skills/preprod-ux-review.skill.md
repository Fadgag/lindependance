# Skill : Revue UX multi-profils en préproduction

## Objectif

Réaliser une revue manuelle, reproductible et en lecture seule de
`https://testing.osezletre.fr` avec les trois profils suivants :

1. **TECH_ADMIN** — toutes les pages et tous les onglets accessibles à ce rôle.
2. **ADMIN** — toutes les pages et tous les onglets accessibles à ce rôle.
3. **Client** — portail public sans connexion, notamment Réserver et Mes rendez-vous.

Le résultat attendu est un rapport daté, les constats confirmés consignés dans
`AMELIORATIONS.md`, et, si l’utilisateur l’autorise, des issues liées au GitHub
Project.

## Quand utiliser ce skill

Utiliser ce skill lorsque l’utilisateur demande une revue UX/UI, responsive ou
d’accessibilité de la préproduction pour les profils TECH_ADMIN, ADMIN et
client, ou demande de refaire la revue complète multi-profils.

## Prérequis et limites de sécurité

- N’utiliser que `https://testing.osezletre.fr`. Ne jamais effectuer cette
  revue sur la production.
- Réutiliser une session de test déjà authentifiée. Si un profil staff n’est
  pas accessible, demander à l’utilisateur de fournir une session de test dans
  le navigateur ; ne pas lui demander de publier un mot de passe ou un code
  OTP dans un rapport, une issue ou un fichier du dépôt.
- Le parcours client est anonyme par défaut. Le parcours après OTP ne fait pas
  partie de cette revue sans demande explicite et compte de test dédié.
- Ne pas créer, modifier, annuler ni supprimer de rendez-vous, clients,
  prestations, encaissements, campagnes ou paramètres. Ne pas envoyer d’e-mail
  ou de code OTP. S’arrêter avant toute action qui persisterait une donnée.
- Ne consulter que des données de test. Si une page révèle des données
  personnelles réelles, ne pas les copier dans les notes ou captures ; arrêter
  l’inspection de ces données et signaler la limite.
- Ne pas corriger le code dans le cadre de la revue. Une correction demandée
  ensuite relève du skill Builder ou d’une tâche de développement distincte.
- Ne jamais déduire une anomalie d’un écran inaccessible, d’une session expirée
  ou d’une erreur transitoire : noter le blocage et les vérifications tentées.

## Procédure

### 1. Préparer la revue

1. Charger `skills/global-rules.md`, `skills/web-design-reviewer.skill.md` et
   `skills/webapp-testing.skill.md`.
2. Lire `AMELIORATIONS.md` et le rapport de revue le plus récent afin d’éviter
   les doublons et de suivre les constats déjà ouverts.
3. Confirmer que le navigateur est sur la préproduction et noter la date, les
   profils accessibles et les limites d’accès. Ne jamais noter d’identifiants
   ou de secrets.
4. Utiliser le navigateur partagé ou l’outillage Playwright disponible. Ne pas
   installer de nouvelle dépendance pour une revue manuelle.

### 2. Parcourir les profils

Pour chaque profil, relever les pages et onglets visibles depuis sa navigation,
puis les parcourir tous. Ne pas inventer de routes cachées ; indiquer les
sections non consultées et leur raison.

- **TECH_ADMIN :** parcourir les pages de gestion globale et les parcours de
  campagnes visibles pour ce rôle, y compris les états liste, détail et
  formulaire lorsqu’ils sont accessibles sans enregistrer de modification.
- **ADMIN :** parcourir le tableau de bord, l’agenda, les demandes de
  changement, les clients, les encaissements et les réglages visibles, dont
  produits et prestations. Vérifier les onglets et états vides pertinents.
- **Client :** consulter les pages publiques du portail, en particulier
  `/portail/osezletre/reserver` et `/portail/osezletre/mes-rdv`. Vérifier
  l’identification affichée, les prestations, créneaux, états non authentifiés
  et contrôles visibles, sans terminer une réservation ni saisir un OTP.

Pour les pages consultées, vérifier au minimum :

- chargement, erreurs et états vides ;
- hiérarchie visuelle, lisibilité, cohérence des libellés et des actions ;
- débordements, contenu coupé ou superposé, navigation et commandes tactiles ;
- clavier, focus visible, noms accessibles et libellés des contrôles ;
- contraste manifeste et dépendance au survol pour découvrir une action.

Inspecter les pages sur grand écran (environ 1440 × 900) et sur petit écran
(320 × 740 et 390 × 844) lorsque la page ou le composant s’y prête. Les tailles
mobiles sont des viewports simulés, pas des tests sur appareils réels. Relever
les filtres, onglets, menus et changements de vue qui peuvent être activés sans
modifier de données.

### 3. Confirmer et qualifier les constats

- Ne consigner que les problèmes observés et reproductibles ; distinguer un
  défaut visuel confirmé d’une hypothèse ou d’une simple recommandation.
- Pour chaque constat, garder le profil, la route, le viewport, les étapes de
  reproduction, le comportement observé et attendu, l’impact et les éléments
  de preuve. Ne pas inclure de données personnelles.
- Classer la sévérité et la confiance en s’appuyant sur les règles du reviewer.
  Un audit manuel ne prouve pas à lui seul la conformité WCAG.
- Si le code source est aussi inspecté, distinguer clairement les preuves
  navigateur des observations faites dans le code.
- Rechercher un constat similaire dans `AMELIORATIONS.md`, les rapports
  précédents et les issues existantes avant d’en créer une nouvelle.

### 4. Produire et synchroniser les résultats

1. Créer `quality/review_report/review_YYYY-MM-DD_HHmm.md`, avec un suffixe
   numérique si le nom existe déjà. Présenter le périmètre, les profils,
   routes et viewports consultés, les limites, puis les constats classés par
   sévérité. Si aucun problème n’est confirmé, le dire sans conclure que
   l’application est exempte de défauts.
2. Ajouter ou compléter dans `AMELIORATIONS.md` uniquement les constats
   confirmés, avec type, statut, priorité proposée, étapes de reproduction,
   impact et critères d’acceptation. Préserver les entrées et statuts existants.
3. Pour une entrée déjà liée à une issue, conserver son numéro et vérifier son
   statut avant de le mettre à jour. Ne pas créer de doublon.
4. Par défaut, préparer les issues candidates et les présenter à l’utilisateur
   pour validation. Ne créer des issues ou modifier le GitHub Project qu’après
   une autorisation explicite. Pour `Fadgag/lindependance`, vérifier que l’action
   GitHub utilise le compte `Fadgag` ; si ce n’est pas le cas, arrêter et
   demander comment procéder. Ne pas modifier le statut d’une issue sans
   confirmation que le travail correspondant a réellement commencé.

## Format du rapport

Le rapport est en français et inclut :

- **Résumé :** conclusion, date et environnement ;
- **Couverture :** état d’accès pour TECH_ADMIN, ADMIN et client, routes,
  viewports, pages parcourues et limites ;
- **Constats :** profil, sévérité, route, viewport, description, preuve,
  reproduction, impact, attendu et confiance ;
- **Non testés :** parcours bloqués ou exclus, avec leur raison ;
- **Suivi :** références aux entrées d’`AMELIORATIONS.md` et, le cas échéant,
  numéros d’issues existantes.

## Fin de revue

Avant le compte rendu, vérifier que le rapport et `AMELIORATIONS.md` ne
contiennent ni secret ni donnée personnelle et que le diff documentaire passe
`git diff --check`. Résumer les profils réellement examinés, les constats
confirmés, les mises à jour effectuées et les limites restantes.
