# Spécification — Personnalisation des e-mails du portail client

**Statut :** Implémentée — migration à appliquer manuellement avant déploiement.
**Source :** `AMELIORATIONS.md` — « Personnaliser les messages envoyés par e-mail »

## Objectif

Permettre au personnel d'adapter le texte des e-mails OTP et de confirmation
de rendez-vous du portail client, indépendamment pour chaque organisation.

## Périmètre et décisions

- Personnaliser le corps uniquement ; l'objet reste généré par le système.
- Saisir du texte brut avec des variables documentées, sans éditeur HTML.
- Un modèle absent ou vide utilise le texte par défaut.
- Les modèles et leur modification sont isolés par l'organisation de la session
  staff ; aucun identifiant d'organisation fourni par le navigateur n'est utilisé.
- Les valeurs dynamiques sont échappées avant leur insertion dans le HTML
  d'e-mail. Le texte saisi conserve ses retours à la ligne.
- Une erreur d'envoi ne doit ni annuler une réservation ni changer le résultat
  déjà confirmé au client.

## Modèles et variables

| E-mail | Variables disponibles | Variables obligatoires |
|---|---|---|
| Code de connexion | `{{organizationName}}`, `{{code}}` | `{{code}}` |
| Confirmation de rendez-vous | `{{organizationName}}`, `{{serviceName}}`, `{{date}}`, `{{startTime}}`, `{{endTime}}`, `{{timezone}}`, `{{portalUrl}}` | `{{serviceName}}`, `{{date}}`, `{{startTime}}`, `{{endTime}}` |

Le code OTP doit rester présent dans son e-mail. La confirmation doit conserver
la prestation, la date et les heures du rendez-vous. Les variables non prises
en charge sont rejetées lors de l'enregistrement.

## Surfaces concernées

- Réglages `Configuration → Portail` : champs texte et indication des variables,
  aperçu des valeurs par défaut et action de réinitialisation.
- `Organization` : deux champs texte nullable, un par modèle.
- `GET/PATCH /api/organization/portal` : lecture et validation des deux modèles.
- Envoi OTP et confirmation/réémission de confirmation : utiliser le modèle
  associé à l'organisation concernée.

## Critères d'acceptation

1. Un membre du personnel peut enregistrer et relire séparément les deux corps
   d'e-mail pour son organisation.
2. Une valeur absente ou vide rétablit le modèle par défaut ; la réinitialisation
   est possible depuis l'interface.
3. Les champs obligatoires sont présents et toute variable inconnue ou mal
   formée est refusée par l'API.
4. Les variables sont remplacées par les données réelles de l'organisation ou
   du rendez-vous, et les caractères HTML saisis par l'organisation ou présents
   dans ces données ne deviennent pas du balisage exécutable.
5. Les confirmations initiales et réémises utilisent le même modèle ; le fichier
   calendrier `.ics` reste joint et inchangé.
6. Un échec d'envoi ne défait pas une réservation, conformément au comportement
   existant.
7. Les tests couvrent validation, valeurs par défaut, remplacement des variables,
   échappement HTML, permissions, isolement par organisation et interface.

## Validation

Ajouter d'abord les tests de domaine, service, API et UI, puis l'implémentation.
Générer une migration Prisma et exécuter les contrôles ciblés ainsi que la revue
automatique prévue dans `skills/global-rules.md`.
