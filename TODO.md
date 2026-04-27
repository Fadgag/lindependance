# 📋 TODO / Dette Technique

## 🔄 Service Worker — Stratégie de cache

**Fichier :** `public/sw.js` + `src/components/RegisterServiceWorker.tsx`

**Stratégie actuelle :** Network-first pour le HTML, cache-first pour `/_next/static/` (assets hashés).

**À considérer à terme :**
- Évaluer si le SW apporte encore de la valeur une fois que l'app sera 100% connectée (pas besoin d'offline).
- Si l'app ne nécessite pas de support offline, **supprimer entièrement le SW** (`public/sw.js` + `RegisterServiceWorker.tsx` + la balise dans `layout.tsx`) — simplifie l'architecture et élimine la complexité de gestion des mises à jour.
- Alternative : migrer vers [`next-pwa`](https://github.com/shadowwalker/next-pwa) ou [`@ducanh2912/next-pwa`] pour une gestion automatisée (Workbox).

**Décision :** Garder en l'état tant que l'app est installée en PWA sur des appareils mobiles. Réévaluer si PWA n'est plus utilisée.

---

## 🏗️ dashboard.service.ts — Fallback productsTotal

**Fichier :** `src/services/dashboard.service.ts`

**Situation :** Les branches try/catch qui retentent les requêtes sans `productsTotal` peuvent être supprimées maintenant que la migration est appliquée en production (colonnes `productsTotal` et `soldProductsJson` présentes sur Neon).

**À faire :** Supprimer les blocs fallback (~80 lignes) pour simplifier le service. Vérifier d'abord la stabilité en prod.

---

## 🧩 God Components — Refactoring (review V29, mineurs restants)

### AppointmentScheduler.tsx (~468 lignes)
Extraire en sous-composants :
- `CalendarToolbar` — barre de navigation + boutons vue
- `CalendarEventContent` — rendu custom des événements
- `CalendarEventTooltip` — logique tippy.js

### AppointmentModal.tsx (~520 lignes)
Extraire en sous-composants :
- `PackageSelector` — choix du forfait client
- `TimeRangeSection` — heure/durée/fin prévue
- `AppointmentFormActions` — boutons Annuler/Supprimer/Sauvegarder

---

## ♿ A11Y — Remplacer `confirm()` natif (review V29)

**Fichiers :** `AppointmentModal.tsx` (L351), `UnavailabilityModal.tsx` (L111)

Les boîtes de dialogue navigateur native (`confirm()`) ne respectent pas le thème de l'app, ne sont pas accessibles (WCAG 2.1 AA), et ne fonctionnent pas dans certains contextes (iframes).

**Fix :** Créer un composant `<ConfirmDialog>` réutilisable ou utiliser `sonner` avec action callback.

---

