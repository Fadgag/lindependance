# 🏗️ Feature Blueprint : Fiabilité du CA & Analytics

**Statut :** READY FOR IMPLEMENTATION
**Target :** Dashboard, Billing Logic, and Test Suite

## 🎯 Objectif Métier
Sécuriser les données financières en automatisant les tests de calcul et améliorer la transparence du Chiffre d'Affaires pour l'utilisatrice en lui permettant de voir le détail des ventes.

---

## 🛠️ Stack & Architecture Imposée

### 1. Tests de Non-Régression (Playwright)
- **Installation :** Installer `@playwright/test`.
- **Fichier de test :** `/tests/e2e/billing-accuracy.spec.ts`.
- **Scénario critique :**
    - Simuler la création d'un RDV avec un **Service** (ex: 40€).
    - Ajouter au même RDV un **Produit** (ex: 15€) avec une quantité de **2**.
    - Valider le paiement.
    - Vérifier que le Dashboard affiche un CA total de **70€** ($40 + (15 \times 2)$).
- **Objectif :** Empêcher toute erreur de calcul lors des futures mises à jour.

### 2. Dashboard Drill-Down (Navigation)
- **Interaction :** Les cartes de statistiques (CA Réalisé, Ventes) doivent devenir cliquables.
- **Composant de vue :** Créer une page ou une modale `/dashboard/details`.
- **Contenu :** - Liste chronologique des encaissements du jour/mois.
    - Détail par ligne : Nom du client | Service principal | Somme des produits | Total TTC.
    - Filtre rapide : "Prestations uniquement" / "Ventes uniquement".
---

## 🧪 Protocole de Validation (Definition of Done)
1. **Test Automatisé :** La commande `npx playwright test` doit retourner "Passed".
2. **Précision :** Le montant affiché sur le Dashboard doit correspondre au centime près au total de la liste détaillée.
3. **Fluidité :** L'agenda mobile doit permettre de scroller de 08h00 à 20h00 sans interruption.

---

## 💡 Notes pour l'Agent
- Utilise les **Server Actions** existantes pour récupérer les données de détails.
- Pour Playwright, assure-toi d'utiliser des variables d'environnement de test pour ne pas polluer la base de données de production.