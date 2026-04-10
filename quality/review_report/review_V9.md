# 🧪 Next.js Code Review Report - V9

**Date :** 2026-04-10
**Reviewer :** Quality Gate Automatique (Skill V3.1)
**Scope :** Audit post-feature `application-native` (PWA)
**Baseline :** V8 → 95/100 ✅ APPROVED
**Tests :** 2 fichiers FAIL, 6 PASS — 1 test FAIL, 10 PASS, 1 skipped

---

## 🧾 Summary

- **Score :** 42/100
- **Verdict :** ❌ BLOCK
- **Stats :** Critical: 1 | Major: 2 | Minor: 7

> **Contexte :** L'activation du Service Worker (`RegisterServiceWorker.tsx`) a introduit une faille de sécurité critique dans `sw.js` (cache d'endpoints authentifiés). De plus, un test unitaire régresse sur `dashboard.service.ts` (`totalProjected` manquant dans le résumé), et `getOrgDashboard` — déclaré supprimé dans V8 — est toujours présent dans `analytics.service.ts`.

---

## 🔴 Critical Issues (Blocking)

### [SÉCURITÉ] Service Worker cache des endpoints authentifiés sans isolation de session

**Fichier :** `public/sw.js` (L1-8 + L20-23)

**Code problématique :**
```javascript
// À l'installation — mise en cache AVANT toute authentification
const urlsToCache = ['/', '/api/appointments', '/api/staff']
caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))

// À chaque fetch — met en cache toutes les réponses /api/
if (request.url.includes('/api/')) {
  const copy = networkResponse.clone()
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
}
```

**Violation :** `global-rules.md` § Sécurité & Data Isolation — "Aucune donnée ne doit être lue ou écrite sans vérifier l'appartenance à `session.organizationId`."

**Impact :** Double risque :
1. **Régression fonctionnelle** : Si le SW s'installe avant la connexion, il met en cache des réponses 401/redirect pour `/api/appointments` et `/api/staff`. Après connexion, le SW sert ces réponses d'erreur en cache → l'agenda ne se charge jamais en mode installé.
2. **IDOR inter-session** : Sur un appareil partagé (employés du salon), les rendez-vous de l'Organisation A (User A) sont mis en cache avec la clé URL `/api/appointments`. Quand User B se connecte, le SW lui sert les données d'appointments de User A. Fuite de données inter-organisation.

**Fix :**
```javascript
// public/sw.js — NE PAS cacher les endpoints authentifiés
const urlsToCache = ['/']  // uniquement le shell statique

// Dans le handler fetch — exclure tous les appels /api/ du cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  // Ne jamais intercepter les appels API authentifiés
  if (request.url.includes('/api/')) return
  // ... cache strategy pour assets statiques seulement
})
```

---

## 🟠 Major Issues

### 1. [TEST INTEGRITY] `res.summary.totalProjected` undefined → test unitaire en échec

**Fichier :** `src/services/dashboard.service.ts` (L188-198) vs `test/analytics.service.spec.ts` (L43)

**Code service (actuel) :**
```typescript
return {
  summary: {
    totalRevenue: totalProjected.toNumber(),      // legacy
    realizedRevenue: totalRealized.toNumber(),
    projectedRevenue: totalProjected.toNumber(),  // ← clé = projectedRevenue
    appointmentCount,
    newCustomerCount,
    staffCount
  },
  timeseries
}
```

**Code test (attend) :**
```typescript
expect(res.summary.totalProjected).toBe(150)  // ← clé = totalProjected → undefined!
```

**Violation :** `global-rules.md` § Intégrité des Tests — "Si un test échoue, le code source doit être corrigé, pas le test."

**Impact :** 1 test unitaire en rouge, CI bloqué, régression non détectée sur le résumé du dashboard.

**Fix :** Ajouter `totalProjected` en alias dans le return de `getDashboardForOrg` :
```typescript
summary: {
  totalRevenue: totalProjected.toNumber(),
  realizedRevenue: totalRealized.toNumber(),
  projectedRevenue: totalProjected.toNumber(),
  totalProjected: totalProjected.toNumber(),  // ← alias pour compatibilité test
  appointmentCount,
  newCustomerCount,
  staffCount
}
```

---

### 2. [DEAD CODE] `getOrgDashboard` toujours présent dans `analytics.service.ts`

**Fichier :** `src/services/analytics.service.ts` (L45-99)

**V8 déclarait :** `✅ FIXED — getOrgDashboard: fonction supprimée`

**Réalité :** La fonction occupe 55 lignes dont le code de conversion Decimal dupliqué (pattern `pobj.toNumber?.()`). Elle duplique exactement la logique de `dashboard.service.getDashboardForOrg`.

**Violation :** DRY — logique métier dupliquée + promesse de V8 non tenue.

**Fix :** Supprimer les lignes 45-99 de `analytics.service.ts` (garder uniquement `getOrgStats` et le default export).

---

## 🟡 Minor Issues

### 1. `RegisterServiceWorker.tsx` — `clientWarn` déclenche un toast intrusif à chaque enregistrement

**Code :**
```typescript
.then(() => {
  clientWarn('Service worker registered for offline support')  // toast à chaque load !
})
// ...
clientWarn('App can be installed ...')  // toast sur beforeinstallprompt
```
`clientWarn` appelle `showToast()` en production → l'utilisateur voit un toast "Service worker registered" à chaque chargement initial. Ce n'est pas une alerte utilisateur, c'est une information de debug. Utiliser `console.info` conditionnel dev-only, sans toast.

---

### 2. `public/manifest.json` — Icônes fallback non pertinentes pour la marque

**Code :**
```json
{ "src": "/next.svg", "sizes": "512x512", "type": "image/svg+xml", "purpose": "maskable any" },
{ "src": "/file.svg", "sizes": "192x192", "type": "image/svg+xml", "purpose": "any" }
```
`next.svg` est le logo du framework Next.js. `file.svg` est une icône générique. Ils ne représentent pas la marque "Indépendance". Chrome/Android utilisera ces icônes sur l'écran d'accueil.

**Fix :** Retirer les SVG fallback — laisser uniquement les entrées PNG (qui seront créées) ou créer un vrai SVG branded.

---

### 3. `src/app/api/appointments/[id]/checkout/route.ts` (L39) — `console.error` natif (V8 carry-over)

```typescript
console.error('Checkout Error:', err)
```
**Fix :** `import { logger } from '@/lib/logger'` → `logger.error('Checkout Error:', { err })`

---

### 4. `src/app/customers/[id]/page.tsx` (L31) — `console.error` côté client (V8 carry-over)

```typescript
console.error('Erreur chargement client', err)
```
**Fix :** `import { clientError } from '@/lib/clientLogger'` → `clientError('Erreur chargement client', err)`

---

### 5. `src/hooks/useAppointments.ts` (L22) — `console.error` côté client (V8 carry-over)

```typescript
if (!isAbortError(err)) console.error(err)
```
**Fix :** `if (!isAbortError(err)) clientError('Erreur chargement rendez-vous', err)`

---

### 6. `src/components/layout/Sidebar.tsx` (L47) — Cast sans commentaire RAISON

```typescript
const user = session?.user as Record<string, unknown> | undefined
```
**Fix :** Utiliser les types `next-auth.d.ts` directement (`session?.user?.role`) ou ajouter `// RAISON: next-auth.d.ts ne type pas encore role sur ClientSession`.

---

### 7. `src/services/analytics.service.ts` (L5) — `where: Record<string, unknown>`

```typescript
const where: Record<string, unknown> = { organizationId: orgId }
```
**Fix :** `import type { Prisma } from '@prisma/client'` → `const where: Prisma.AppointmentWhereInput = { organizationId: orgId }` (V8 carry-over).

---

## 🛡️ Bilan Sécurité (Anti-IDOR)

| Route | Scoping `organizationId` | Verdict |
|-------|--------------------------|---------|
| `GET /api/appointments` | `where: { organizationId }` | ✅ |
| `POST /api/appointments/[id]/checkout` | `updateMany where: { organizationId }` | ✅ |
| `GET /api/customers` | `where: { organizationId }` | ✅ |
| `GET /api/customers/[id]/packages` | guard customer ownership | ✅ |
| `GET /api/stats/dashboard` | `getDashboardForOrg(orgId, ...)` | ✅ |
| `sw.js` — cache `/api/appointments` | ❌ Aucun scoping session | **🔴 CRITICAL** |

---

## 🧠 Global Recommendations

1. **Service Worker** : Stratégie "app shell" uniquement — seuls les assets statiques (CSS, JS, fonts, icons) doivent être mis en cache. Les endpoints API authentifiés (`/api/*`) ne doivent **jamais** être interceptés ou mis en cache par le SW. Utiliser une stratégie `network-first` ou simplement ne pas intercepter.

2. **`clientWarn` vs debug** : Le module `clientLogger` expose `clientWarn` qui affiche un toast. Réserver cela aux erreurs utilisateur. Créer un `clientDebug` dev-only sans toast pour les logs techniques (enregistrement SW, etc.).

3. **Icônes PWA** : Fournir `/public/icon-192.png` et `/public/icon-512.png` branded avant de passer en production (iOS Safari les utilise pour apple-touch-icon, Chrome Android pour l'icône sur écran d'accueil).

4. **Tests** : Ajouter un test unitaire pour `RegisterServiceWorker` (JSDOM + `navigator.serviceWorker` mock) pour valider la logique de sécurité (isSecureContext guard, cleanup listener).

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

### Priorité 1 — 🔴 Sécurité Critique
- `public/sw.js` : Retirer `/api/appointments` et `/api/staff` de `urlsToCache`. Exclure tous les `/api/*` du handler fetch (ne pas intercepter, laisser passer au réseau).

### Priorité 2 — 🟠 Intégrité des Tests
- `src/services/dashboard.service.ts` : Ajouter `totalProjected` dans le summary return.
- `src/services/analytics.service.ts` : Supprimer `getOrgDashboard` (L45-99, dead code).

### Priorité 3 — 🟡 Clean Code
- `RegisterServiceWorker.tsx` : Remplacer `clientWarn(...)` par `if (process.env.NODE_ENV === 'development') console.info(...)` (sans toast).
- `checkout/route.ts`, `customers/[id]/page.tsx`, `useAppointments.ts` : `console.error` → `logger.error` / `clientError`.
- `Sidebar.tsx` : Cast `as Record<string, unknown>` → types `next-auth.d.ts` ou RAISON commenté.
- `manifest.json` : Retirer les icônes SVG génériques framework.
- `analytics.service.ts` L5 : `Record<string, unknown>` → `Prisma.AppointmentWhereInput`.

---

## 🧮 Final Decision

**❌ BLOCK**

Score calculé : 100 − 1×25 − 2×10 − 7×3 = **100 − 25 − 20 − 21 = 34/100**

Le projet régressait de 95 → 34. La cause principale est l'activation du SW pré-existant qui met en cache des données authentifiées (`/api/appointments`, `/api/staff`) sans isolation de session — faille IDOR critique sur appareils partagés + bug fonctionnel (cache de 401 avant connexion). Les 2 Majors (test KO + dead code non supprimé) et 7 Minors (console.error carry-over + UX toast SW) complètent le tableau. Fix requis avant merge.

