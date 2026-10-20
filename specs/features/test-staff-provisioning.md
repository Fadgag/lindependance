# Feature — Provisionner un compte staff de test

## Objectif

Permettre à un administrateur technique de créer un salon synthétique et un
compte staff utilisable pour les essais, sans mot de passe provisoire ni
attribution du rôle `TECH_ADMIN`.

## Parcours et sécurité

- Le provisionnement est disponible uniquement sur une preview Vercel de la
  branche `preprod` et exige une autorisation `TECH_ADMIN` vérifiée côté serveur.
- Le `TECH_ADMIN` saisit une adresse de test, confirme qu'il contrôle cette
  boîte et autorise l'envoi ; le bouton de soumission constitue l'action
  explicite qui déclenche la création et l'invitation.
- Le rôle est `USER` par défaut. Le `TECH_ADMIN` peut choisir `ADMIN`. Aucun
  autre rôle, notamment `TECH_ADMIN`, n'est accepté.
- Le compte et les données synthétiques du salon sont créés dans une même
  transaction. Le compte est associé côté serveur à l'organisation créée ;
  l'identifiant d'organisation ne vient jamais du navigateur.
- Aucun mot de passe initial n'est créé. Un lien aléatoire à usage unique,
  valable une heure, est envoyé à l'adresse confirmée pour que son titulaire
  définisse son mot de passe avec le parcours existant.
- Ni le jeton d'activation ni un mot de passe ne sont renvoyés dans l'API,
  affichés dans l'interface ou écrits dans les journaux.
- Si la configuration e-mail manque ou si l'envoi échoue, le salon et le
  compte restent créés, et l'interface indique explicitement que l'e-mail n'a
  pas été envoyé. Aucun secret n'est révélé.
- Les tests automatisés simulent le fournisseur e-mail. La recette manuelle
  utilise exclusivement une boîte de test contrôlée et une action d'envoi
  autorisée ; aucun e-mail réel n'est envoyé par le développement ou les tests.

## API

- `POST /api/tech-admin/test-salons` accepte une adresse e-mail, un rôle
  `USER`/`ADMIN` et une confirmation explicite de contrôle de la boîte.
- L'API conserve la réponse privée sans cache ; elle ne reçoit aucun
  `organizationId` et ne permet pas de choisir ou d'attribuer `TECH_ADMIN`.

## Critères d'acceptation

1. Une personne non authentifiée ou sans rôle `TECH_ADMIN` ne peut pas créer
   de salon, de compte ou d'e-mail.
2. Toute requête hors de la preview de la branche `preprod`, incomplète ou
   contenant un rôle non autorisé ou un champ `organizationId` est refusée.
3. Le salon, ses données fictives et le compte staff appartiennent à la même
   organisation ; le mot de passe initial reste vide.
4. `USER` est le rôle par défaut ; `ADMIN` n'est appliqué qu'après sélection
   explicite.
5. Le lien d'activation est à usage unique et expire après une heure ; aucune
   valeur secrète n'est visible dans la réponse, l'interface ou les journaux.
6. L'échec d'envoi est visible et n'est pas présenté comme une invitation
   réussie.
7. Une recette bêta avec une boîte contrôlée confirme la réception, la
   définition du mot de passe, la connexion au salon créé et l'échec d'une
   seconde utilisation du lien.
