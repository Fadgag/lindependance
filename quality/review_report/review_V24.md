# 🧪 Next.js Code Review Report - V24

## 🧾 Summary
- **Score:** 74/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 2 | Minor: 2
- **Scope:** Branche `feature/sw-activate-prompt` — `git diff origin/main...feature/sw-activate-prompt` (2 fichiers : `public/sw.js`, `src/components/RegisterServiceWorker.tsx`)

---

## 🔴 Critical Issues (Blocking)
_Aucun._

---

## 🟠 Major Issues

### [CLEAN CODE] Import `toast` inutilisé dans `RegisterServiceWorker.tsx`

**Problem :**  
`import { toast } from 'sonner'` (ligne 3) est déclaré mais `toast` n'est jamais appelé dans le fichier. La fonction `notifyUpdate` utilise `window.confirm` à la place. Violation des global-rules : "Nettoyer les imports inutilisés (`pnpm lint --fix`)".  
Produira un warning ESLint `@typescript-eslint/no-unused-vars` bloquant les pipelines CI.

**Fix :**  
Supprimer la ligne `import { toast } from 'sonner'`.

---

### [ARCHITECTURE] Double listener `activate` dans `sw.js`

**Problem :**  
`sw.js` déclare deux blocs `self.addEventListener('activate', ...)` séparés (lignes 38–42 et lignes 44–47). Les deux s'exécutent mais l'ordre d'exécution de `waitUntil` entre deux listeners indépendants sur le même événement est ambigü et peut provoquer une race condition entre la purge des caches et `clients.claim()`. Le Service Worker spec recommande de grouper ces opérations dans un seul handler `activate` avec `Promise.all`.

**Fix :**  
Fusionner les deux listeners en un seul :
```js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k) }))),
      self.clients.claim()
    ])
  )
})
```

---

## 🟡 Minor Issues

1. **`console.info` en production** — `RegisterServiceWorker.tsx` ligne 37 : `if (process.env.NODE_ENV === 'production') console.info('[SW] Service worker registered...')`. Ce log s'exécute **en production** et viole les global-rules "Pas de Logs de Debug". Supprimer ou remplacer par `logger.debug` (qui est silencieux hors `development`).

2. **`window.confirm` bloquant / incompatible PWA** — `notifyUpdate` utilise `window.confirm` qui est un dialog modal synchrone. Sur iOS PWA et certains navigateurs mobiles modernes, `window.confirm` est silencieusement ignoré ou supprimé. L'utilisateur ne verra jamais la notification de mise à jour. Recommandé : remplacer par un `toast` avec bouton Actualiser (non-bloquant), ou un `<div>` bannière fixe.

---

## 🧠 Global Recommendations

1. **Remplacer `window.confirm` par un toast non-bloquant** (option A proposée précédemment) : utiliser `toast.custom` de `sonner` ou un composant `UpdateBanner` autonome pour notifier l'utilisateur sans bloquer le thread. C'est la pratique standard des PWA (ex : Workbox, vite-plugin-pwa).
2. **Incrémenter `CACHE_NAME` à chaque déploiement** : automatiser via un hash de build ou une variable d'environnement injectée par Vercel (ex : `CACHE_NAME = 'app-cache-' + process.env.NEXT_PUBLIC_BUILD_ID`). Cela rend la purge du cache systématique sans intervention manuelle.
3. **Ajouter un test e2e ou unitaire** pour le comportement de mise à jour du SW (utiliser `@vitest/browser` ou Playwright avec mock des APIs Service Worker).

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 :** Supprimer `import { toast } from 'sonner'` dans `RegisterServiceWorker.tsx`.
2. **Priorité 2 :** Fusionner les deux `activate` listeners dans `sw.js` en un seul `Promise.all`.
3. **Priorité 3 :** Supprimer/remplacer le `console.info` de production dans `RegisterServiceWorker.tsx`.
4. **Recommandé :** Remplacer `window.confirm` par un toast non-bloquant.

---

## 🧮 Final Decision
**⚠️ CHANGES REQUIRED** — Logique de mise à jour SW fonctionnelle (`SKIP_WAITING` + `controllerchange` + `clients.claim`). Sécurité maintenue (pas de cache des `/api/`). 2 Majors bloquants : import inutilisé (CI) et double listener activate (race condition potentielle). 2 Minors à corriger pour qualité et compatibilité PWA iOS.

