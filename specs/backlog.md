# 🗂️ Product Backlog - Evolution de l'Application

Ce fichier centralise les fonctionnalités à venir. Chaque item doit être transformé en spec détaillée dans `specs/features/` avant d'être confié au `/builder`.

---

## ⚡ En attente de Spécification (Priorités Immédiates)

### 1. Dashboard de Performance 📊
- **Concept :** Vue d'ensemble du CA et de l'activité pour le gérant.
- **KPIs :** CA mensuel, Nombre de clients créés, Taux d'occupation.
- **Sécurité :** Audit strict de l'isolation `organizationId`.
- **Statut :** Prêt à être spécifié.

### 2. Checkout Workflow (Levée de fiche) 💸
- **Concept :** Clic sur un RDV dans le dashboard pour ajuster le prix final.
- **Actions :** Ajouter des options de dernière minute (ex: Patine, Soin profond).
- **Logique :** Calcul dynamique du total (Base + Extras).
- **Clôture :** Marquer comme `PAID` et impacter les stats de revenus.
- **Note :** Pas de gestion comptable légale (PDF/TVA), uniquement suivi interne.

---

## 🚀 Backlog Futur (Phase 3)

### 3. Système de Notifications 🔔
- **Concept :** Rappels automatiques pour réduire les "No-shows".
- **Canaux :** SMS (Twilio) ou Email (Resend).
- **Trigger :** T-24h avant le rendez-vous.

### 4. Export de Données 📤
- **Concept :** Export CSV/Excel des listes clients et des rapports financiers.
- **Usage :** Permettre au gérant de donner ses chiffres à son comptable externe.

---

## 🛠️ Maintenance & Dette Technique

### 5. Refactoring "Global Rules" 🏗️
- **Action :** Passer l'existant (Code legacy) au crible du `reviewer` pour appliquer les `global-rules.md`.
- **Focus :** Remplacer les `any` restants et généraliser les schémas Zod.

### 6. Optimisation Mobile du Dashboard 📱
- **Concept :** Rendre les tableaux et le calendrier parfaitement utilisables sur smartphone pour les gérants en déplacement.