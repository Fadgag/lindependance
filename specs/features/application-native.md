# 🏗️ Skill: Feature Blueprint
**Statut :** VALIDATED
**Feature :** PWA Transformation (Installable App)

## 🎯 Objectif Métier
Permettre l'installation d'Indépendance comme une application sur mobile (iOS/Android). L'utilisateur doit pouvoir l'ajouter à son écran d'accueil et l'utiliser en plein écran (sans interface de navigateur).

## 🛠️ Stack & Architecture Imposée
1. **Metadata :** Créer `src/app/manifest.ts` (ou `public/manifest.json`) avec :
    - `name`: "Indépendance"
    - `display`: "standalone"
    - `start_url`: "/"
2. **Icons :** Utiliser une icône carrée (512x512) placée dans `/public/icon.png`.
3. **Layout Settings :** Dans `src/app/layout.tsx`, ajouter les meta-tags pour iOS :
    - `apple-mobile-web-app-capable`: "yes"
    - `apple-mobile-web-app-status-bar-style`: "default"
4. **Theme Color :** Définir une couleur de thème qui correspond à ta charte graphique.

## 🧪 Protocole de Test (Definition of Done)
- **Sur iPhone :** Ouvrir le site dans Safari > Partager > "Sur l'écran d'accueil". Lancer l'app : elle doit être en plein écran.
- **Sur Chrome Desktop :** Une petite icône "Installer" doit apparaître dans la barre d'URL.