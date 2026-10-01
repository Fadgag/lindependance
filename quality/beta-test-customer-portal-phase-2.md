# Recette bêta — Portail client, phase 2

Cette checklist vérifie la consultation des rendez-vous futurs et leur
annulation par un client authentifié. À réaliser sur un environnement de test,
jamais avec des fiches ou rendez-vous de vrais clients.

**Testeur :** ____________________
**Date :** ____________________
**Environnement / navigateur :** ____________________
**Organisation de test (slug) :** ____________________
**Fuseau de l’organisation :** ____________________

Pour chaque scénario, cocher le résultat et noter les détails utiles :
**Résultat :** [ ] Réussi [ ] Échec [ ] Bloqué — **Notes :** ____________________

## Préparation par le staff

Dans une organisation de test avec le portail activé, préparer :

- [ ] Deux fiches client distinctes partageant la même adresse email de test.
- [ ] Une troisième fiche avec une autre adresse email, dans la même organisation.
- [ ] Un rendez-vous futur à plus de 24 heures, lié à un forfait dont le nombre
  de séances restantes est connu.
- [ ] Un rendez-vous futur à plus de 24 heures, sans forfait.
- [ ] Un rendez-vous exactement à 24 heures et un autre à moins de 24 heures.
- [ ] Un rendez-vous passé et un rendez-vous déjà annulé pour l’adresse partagée.
- [ ] Si possible, une seconde organisation avec une fiche et un rendez-vous de
  test associés à l’adresse email partagée, pour tester l’isolation.
- [ ] Une boîte email de test accessible pour recevoir un code OTP.

Noter les identifiants de suivi des rendez-vous et le solde initial du forfait
hors de cette checklist. Utiliser des données dédiées, facilement réinitialisables.

## Parcours à tester

### 1. Accès sans session

- [ ] Ouvrir `/portail/<slug>/mes-rdv` dans une fenêtre privée, sans session client.
- [ ] Vérifier qu’aucun rendez-vous ni nom de client n’est affiché.
- [ ] Vérifier que la page invite à vérifier l’email et propose un lien vers la
  réservation / l’identification.

### 2. Connexion OTP et fiches partagées

- [ ] Depuis le lien d’identification, demander un code OTP pour l’adresse partagée.
- [ ] Vérifier que le code est reçu et accepté une seule fois.
- [ ] Revenir sur « Mes rendez-vous » et actualiser la page.
- [ ] Vérifier que la session reste authentifiée et que les rendez-vous des deux
  fiches portant cette adresse sont visibles.
- [ ] Vérifier que les deux membres de la famille sont clairement distingués.

### 3. Liste, tri et fuseau horaire

- [ ] Vérifier que seuls les rendez-vous futurs et non annulés apparaissent.
- [ ] Vérifier que le rendez-vous passé et celui déjà annulé sont absents.
- [ ] Vérifier que les rendez-vous sont triés du plus proche au plus lointain.
- [ ] Pour chaque rendez-vous, vérifier le membre concerné, la prestation, le
  praticien, la date/heure et le statut.
- [ ] Comparer l’heure affichée au fuseau de l’organisation, y compris si le
  navigateur ou l’appareil utilise un autre fuseau.
- [ ] Vérifier qu’aucune donnée d’une fiche portant une autre adresse email
  n’apparaît.

### 4. Annulation autorisée sans forfait

- [ ] Repérer le rendez-vous sans forfait, situé à plus de 24 heures.
- [ ] Cliquer sur « Annuler » et vérifier le retour de confirmation visuel
  (rendez-vous retiré de la liste).
- [ ] Actualiser la page et vérifier que le rendez-vous reste absent.
- [ ] Demander au staff de vérifier que le rendez-vous existe toujours en base
  avec le statut « CANCELLED ».
- [ ] Vérifier qu’aucun crédit de forfait n’a été modifié.

### 5. Annulation autorisée avec forfait

- [ ] Noter le solde initial du forfait.
- [ ] Annuler le rendez-vous lié au forfait, situé à plus de 24 heures.
- [ ] Vérifier que le rendez-vous disparaît de « Mes rendez-vous » et que son
  statut est « CANCELLED » côté staff.
- [ ] Vérifier que le solde du forfait a augmenté d’une seule séance.
- [ ] Actualiser la page et répéter une tentative d’annulation via l’interface :
  le rendez-vous ne doit pas réapparaître et le solde ne doit pas augmenter une
  seconde fois.
- [ ] Testeur technique : réémettre une requête `DELETE` pour l’identifiant déjà
  annulé et vérifier que le solde reste inchangé.

### 6. Annulation à 24 heures ou moins

- [ ] Pour le rendez-vous exactement à 24 heures, vérifier que l’action
  « Annuler » n’est pas proposée et que la page invite à contacter
  l’établissement.
- [ ] Répéter avec le rendez-vous situé à moins de 24 heures.
- [ ] Vérifier côté staff que les deux rendez-vous sont inchangés et que les
  crédits associés n’ont pas bougé.

### 7. Contrôle serveur de la limite de 24 heures — test technique

À réaliser par un testeur ayant accès aux outils de développement du navigateur :

- [ ] Avec la session client connectée, ouvrir la console du navigateur et
  exécuter la commande suivante en remplaçant `<id>` par l’identifiant du
  rendez-vous à 24 heures :

  ```js
  fetch('/api/portail/rdv/<id>', {
    method: 'DELETE',
    credentials: 'include',
  }).then(async (response) => ({
    status: response.status,
    body: await response.json(),
  }))
  ```

- [ ] Vérifier que l’API refuse l’annulation (HTTP 409) et indique de contacter
  l’établissement.
- [ ] Vérifier que le rendez-vous reste actif et qu’aucun crédit n’est recrédité.
- [ ] Répéter avec l’identifiant d’un rendez-vous d’une autre fiche et d’un
  rendez-vous d’une autre organisation : l’API ne doit pas les annuler ni
  révéler leurs détails (réponse « non trouvé »).

### 8. Isolation de session et réponses aux erreurs

- [ ] Demander un nouveau code OTP pour la troisième fiche (adresse différente)
  et vérifier qu’elle ne voit que ses propres rendez-vous.
- [ ] Sans session client, appeler `GET /api/portail/rdv` : vérifier une réponse
  non autorisée (HTTP 401) et l’absence de données de rendez-vous.
- [ ] Avec une session distincte, se connecter à la seconde organisation avec
  l’adresse partagée et vérifier que la liste contient uniquement ses
  rendez-vous dans cette organisation.

## Résumé de la recette

**Scénarios réussis :** ____ / 8
**Scénarios échoués :** ____ / 8
**Scénarios bloqués :** ____ / 8
**Anomalies / étapes de reproduction :**

____________________________________________________________________________

____________________________________________________________________________

**Décision bêta :** [ ] Validé [ ] À corriger avant validation
