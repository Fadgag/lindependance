# Coordonnées des fiches client

## Contexte

Les fiches client sont gérées par le personnel de chaque organisation. Un
téléphone peut être partagé au sein d'une famille et sert au personnel pour
contacter la personne ; il ne constitue pas un identifiant de fiche. L'adresse
e-mail de la fiche est utilisée par le portail client pour la connexion et les
notifications.

## Numéros de téléphone partagés

### Résultat attendu

Une organisation peut enregistrer le même numéro de téléphone sur plusieurs
fiches. Chaque fiche reste séparée et les parcours de sélection d'un client ne
déduisent jamais l'identité à partir du téléphone.

### Critères d'acceptation

- La création d'une fiche autorise un numéro déjà utilisé par une autre fiche.
- La création rapide depuis le calendrier autorise aussi ce numéro et crée une
  nouvelle fiche au lieu de sélectionner la fiche existante.
- La sélection des clients dans le calendrier continue de se faire par nom et
  identifiant de fiche.
- Les données demeurent isolées par organisation.
- La recette staff correspondante est décrite dans `ADM-15` du guide
  `quality/recette-beta-admin.md`.

## Message d'information sur l'adresse e-mail

### Résultat attendu

Depuis la fiche client, le personnel peut envoyer un e-mail à l'adresse
enregistrée. Il confirme que cette adresse figure dans la fiche, indique qu'elle
doit être utilisée pour les réservations en ligne et fournit un bouton vers le
portail de réservation de l'organisation.

Le client confirme verbalement au personnel qu'il a reçu le message. Il n'y a
ni jeton de vérification, ni état « vérifié », ni lien expirant.

### Critères d'acceptation

- Un bouton d'envoi est disponible sous le champ d'adresse e-mail de la fiche.
- Si le champ a été modifié, la nouvelle adresse est enregistrée avant l'envoi.
- L'e-mail est envoyé à l'adresse enregistrée et indique qu'elle doit être
  utilisée pour les réservations en ligne. Il invite le client à confirmer
  verbalement au personnel qu'il a reçu le message.
- Le bouton « Réserver en ligne » ouvre le portail de réservation de
  l'organisation concernée.
- L'envoi requiert une adresse et un portail actif avec un slug configuré.
- Les erreurs d'envoi sont présentées au personnel ; l'envoi ne paraît jamais
  réussi en cas d'échec.
- L'action est réservée au personnel authentifié de l'organisation propriétaire
  de la fiche.
- La recette staff correspondante est décrite dans `ADM-16` du guide
  `quality/recette-beta-admin.md`.
