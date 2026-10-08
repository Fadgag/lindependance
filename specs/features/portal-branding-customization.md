# Spécification — Personnalisation de l’identité du portail client

**Statut :** Implémentée — réglage commun et contrôles automatisés validés le 8 octobre 2026 ; recette manuelle bêta à effectuer.
**Source :** `AMELIORATIONS.md` — « Personnaliser l'apparence du nom et du logo du salon »

## Objectif

Permettre à un administrateur de personnaliser l’affichage du nom et du logo du
salon sur toutes les pages du portail client, avec un aperçu avant
l’enregistrement.

## Parcours et périmètre

- Les réglages sont accessibles aux administrateurs du salon depuis les
  paramètres d’identité existants.
- Les réglages sont enregistrés pour l’organisation de la session ; un
  identifiant d’organisation fourni par le navigateur ne fait jamais autorité.
- Ils s’appliquent aux pages publiques de réservation et « Mes rendez-vous ».
- Un réglage unique de taille du logo s’applique à l’espace de gestion et au
  portail client.
- L’aperçu intégré présente uniquement le bloc nom + logo et peut basculer entre
  les rendus mobile et grand écran. Il se met à jour avant l’enregistrement.

## Nom du salon

- Proposer une courte liste de polices intégrées au projet, sans chargement de
  polices depuis un service externe.
- Le nom a un curseur unique de 14 à 24 px. Son rendu s’adapte automatiquement
  aux écrans plus étroits.
- Proposer une palette limitée dont chaque couleur respecte un contraste d’au
  moins 4,5:1 sur le fond clair du portail.
- Proposer trois graisses (normale, semi-grasse, grasse) et trois alignements
  (gauche, centré, droite).
- L’alignement règle uniquement le texte du nom et ne déplace pas le logo.

## Logo

- Conserver l’import PNG, JPEG et WebP avec la limite existante de 10 Mo.
- À l’import, afficher un cadre de recadrage carré avec masque superposé ;
  permettre le déplacement de l’image et le zoom avant validation.
- L’image finale reste carrée et respecte la forme d’affichage déjà choisie
  (ronde ou carrée), sans déformation.
- Seul le résultat recadré est enregistré. Changer le cadrage ultérieurement
  nécessite de réimporter l’image source.
- Proposer un curseur commun de taille du logo de 24 à 160 px. Dans l’espace de
  gestion, le rendu est plafonné à 64 px dans la barre latérale et 48 px sur
  mobile. Dans le portail client, il est plafonné à 128 px sur mobile et 160 px
  sur grand écran.

## Enregistrement et valeurs par défaut

- Un bouton « Rétablir les valeurs par défaut » réinitialise localement les
  réglages du formulaire et de l’aperçu ; les changements sont persistés
  uniquement après « Enregistrer les modifications ».
- Les valeurs par défaut préservent l’apparence actuelle autant que possible :
  Manrope, 18 px, couleur foncée, graisse semi-grasse, alignement à gauche et
  logo réglé à 48 px.
- Le profil et les champs sont validés côté serveur par Zod. Les choix fermés
  sont des énumérations et les dimensions sont bornées ; aucun CSS libre n’est
  fourni par l’utilisateur.

## Critères d’acceptation

1. Un administrateur peut enregistrer les réglages d’apparence de son salon ;
   ceux d’un autre salon ne peuvent être ni lus ni modifiés.
2. Le nom suit les choix enregistrés de police, taille, couleur, graisse et
   alignement sur la réservation et « Mes rendez-vous ».
3. Le réglage commun du logo met à jour l’espace de gestion et le portail ;
   l’espace de gestion est plafonné à 64 px dans la barre latérale et 48 px sur
   mobile, et le portail à 128 px sur mobile et 160 px sur grand écran.
4. L’aperçu simple reflète immédiatement les choix et permet de vérifier les
   rendus mobile et grand écran avant sauvegarde.
5. L’import refuse les types non pris en charge et les fichiers dépassant 10 Mo.
   Le recadrage n’enregistre pas l’image source et peut être changé après un
   nouvel import.
6. Le rétablissement des valeurs par défaut fonctionne et ne persiste pas avant
   l’action explicite d’enregistrement.
7. Les guides de recette permettent de vérifier la configuration côté staff
   et l’affichage côté client.
