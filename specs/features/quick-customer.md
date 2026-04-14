# 🏗️ Skill: Feature Blueprint
**Statut :** VALIDATED
**Feature :** Création de client "Inline" dans la modale RDV

## 🎯 Objectif Métier
Permettre la création instantanée d'un nouveau client sans quitter le formulaire de prise de rendez-vous. Fluidifier le parcours utilisateur pour les nouveaux prospects.

## 🛠️ Stack & Architecture Imposée
1. **Composant UI (Interaction) :**
    - Dans `QuickAppointmentModal.tsx`, modifier le sélecteur de client.
    - Si l'option "Créer nouveau client" est sélectionnée, afficher un sous-formulaire ou une seconde modale (`Dialog` imbriqué).
2. **Champs du sous-formulaire :**
    - Prénom & Nom (Obligatoires).
    - Téléphone (Recommandé pour les rappels).
3. **Logic Layer (Server Action) :**
    - Créer une action `createClientAndReturn` qui :
        1. Enregistre le client dans la table `Client`.
        2. Retourne l'ID du client créé.
        3. Sélectionne automatiquement ce client dans le champ "Client" du rendez-vous en cours.

## 📱 Expérience Utilisateur (UX)
- **Fluidité :** Une fois le client créé, le sous-formulaire se ferme et l'utilisateur se retrouve sur le formulaire de RDV avec le nom du client déjà rempli.
- **Feedback :** Afficher un petit Toast de succès : "Client ajouté et sélectionné".

## 🛡️ Règles de Sécurité
- [ ] Lier systématiquement le nouveau client à l'ID de l'organisation de l'utilisateur.
- [ ] Vérifier les doublons par numéro de téléphone pour éviter les fiches clients multiples.

## 🧪 Protocole de Test (Definition of Done)
1. Ouvrir la modale "Nouveau RDV".
2. Cliquer sur "Créer nouveau client".
3. Remplir les infos et valider.
4. Vérifier que le client est bien sélectionné dans le RDV et qu'il est bien présent dans la base de données après la validation finale.