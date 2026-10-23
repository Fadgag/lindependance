# Feature — Gérer les comptes d'un salon

## Objectif

Permettre à chaque salon d'avoir un premier compte `ADMIN`, puis à ses
administrateurs de créer et gérer les comptes de leur propre organisation.

## Rôles et accès

- Seul un compte `TECH_ADMIN` peut créer le premier `ADMIN` d'un salon existant.
- Cette création est disponible uniquement sur l'aperçu Vercel de la branche
  `preprod`. Le `TECH_ADMIN` choisit explicitement le salon cible.
- Après cette initialisation, les comptes `ADMIN` du salon peuvent inviter des
  comptes et gérer ceux de leur organisation.
- Les seuls rôles attribuables depuis ces parcours sont `USER` et `ADMIN`.
  Aucun compte de salon ne peut attribuer `TECH_ADMIN`.
- Les listes, changements et suppressions de comptes sont strictement limités à
  l'organisation de l'administrateur authentifié. Un identifiant d'organisation
  fourni par le navigateur ne détermine jamais le périmètre d'un ADMIN.
- Un ADMIN ne peut ni modifier/supprimer son propre compte ni retirer le dernier
  ADMIN du salon.
- Les sessions reprennent le rôle et l'organisation du compte en base ; une
  rétrogradation ou une suppression ne conserve pas les anciens droits d'une
  session déjà ouverte.

## Invitation et activation

- L'invitation exige la confirmation explicite que l'adresse est contrôlée par
  la personne invitée et autorise l'envoi.
- Le navigateur ne fournit et ne reçoit aucun mot de passe ni jeton.
- Le compte est créé sans mot de passe. Un jeton aléatoire à usage unique,
  valable une heure, est stocké sous forme hachée et envoyé par e-mail afin
  que la personne définisse son mot de passe avec le parcours existant.
- Les doublons d'adresse sont refusés explicitement sans envoyer de seconde
  invitation. L'échec d'envoi est présenté comme tel ; le compte reste en
  attente et aucun secret n'est révélé.
- Les tests simulent le fournisseur e-mail. Aucun e-mail réel ni compte de
  préproduction ne doit être créé par le développement ou les tests.

## Critères d'acceptation

1. Une personne non authentifiée, un compte `USER` ou un client ne peut pas
   consulter ou modifier les comptes du salon.
2. Seul un `TECH_ADMIN` autorisé sur l'aperçu de `preprod` peut choisir un
   salon existant dépourvu d'ADMIN et créer son premier compte ADMIN ; une
   seconde création est refusée.
3. Un ADMIN de salon ne voit, ne crée et ne modifie que des comptes appartenant
   à son organisation, même si le navigateur fournit un autre identifiant.
4. Les rôles proposés et acceptés sont `USER` et `ADMIN` uniquement.
5. Une invitation crée un compte sans mot de passe, envoie un lien à usage
   unique valable une heure et ne renvoie aucun jeton ou mot de passe.
6. Les adresses en doublon, les rôles invalides et les erreurs d'envoi sont
   traités explicitement.
7. Un compte ADMIN ne peut pas se supprimer/se rétrograder lui-même ni
   supprimer/rétrograder le dernier ADMIN du salon.
8. Les tests automatisés couvrent l'autorisation, l'isolation, les doublons,
   les règles de rôle, l'activation et les réponses sans secret.
9. Une vérification bêta autorisée avec des boîtes contrôlées confirme
   l'invitation, la définition du mot de passe et l'isolation entre salons.
