# 🏗️ Skill: Feature Blueprint
**Statut :** VALIDATED
**Feature :** Layout Responsive & Navigation Mobile

## 🎯 Objectif Métier
Permettre aux professionnels d'utiliser l'application "Indépendance" sur smartphone. Actuellement, la sidebar fixe bloque la visibilité. L'objectif est de masquer la navigation par défaut sur mobile et de l'intégrer dans un menu tiroir (burger menu).

## 🛠️ Stack & Architecture Imposée
1. **Schema Prisma :** - [x] Aucun changement (UI uniquement).
2. **Logic Layer (Hooks) :**
    - Utiliser un état React (`isOpen`, `setIsOpen`) pour gérer l'ouverture du menu.
    - Utiliser les media queries Tailwind (`sm:`, `md:`, `lg:`) pour adapter les composants.
3. **UI Layer :**
    - **Composants :** Utiliser `Sheet` (de Shadcn/ui) ou une transition CSS `transform` pour la Sidebar.
    - **Header Mobile :** Créer un composant `MobileHeader` (visible uniquement sur mobile) avec un bouton Burger.
    - **Icons :** Utiliser `Menu` et `X` de la librairie `lucide-react`.
4. **Layout :**
    - Le contenu principal (`main`) doit avoir un `padding` adapté pour ne pas être caché par le Header Mobile.

## 🛡️ Règles de Sécurité (Anti-IDOR)
- [x] N/A (Modification visuelle uniquement).

## 🧪 Protocole de Test (Definition of Done)
- **Responsive :** En réduisant la largeur du navigateur, la sidebar desktop disparaît et le bouton burger apparaît.
- **Interactivité :** Le menu s'ouvre au clic sur le burger. Le clic sur un lien de navigation ferme le menu automatiquement.
- **Affichage des données :** Les tableaux de clients et d'encaissements sont consultables via un scroll horizontal (`overflow-x-auto`) sans casser la mise en page.