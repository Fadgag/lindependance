# 🏗️ Spec: Infrastructure Migration - Middleware to Proxy (V1.0)

## 🎯 Objectif
Remplacer la convention dépréciée `proxy.ts` par le nouveau standard Next.js `proxy.ts`.
Ce composant est le point d'entrée unique pour la sécurité, l'authentification et l'isolation des données (`organizationId`).

---

## 🛠️ Changements Architecturaux

### 1. Suppression du Legacy
- **Action :** Identifier et supprimer `src/proxy.ts` (ou à la racine).
- **Nettoyage :** Retirer les références au middleware dans `next.config.js` si nécessaire.

### 2. Implémentation du Proxy (`proxy.ts`)
Le nouveau fichier `proxy.ts` doit gérer trois couches :
1. **Couche Auth :** Vérifier la validité du JWT ou de la session.
2. **Couche Isolation :** Extraire l'`organizationId` de la session.
3. **Couche Header :** Injecter l'ID dans les headers de la requête (`x-org-id`) pour que les API Routes et Server Components n'aient pas à le recalculer.

---

## 🧪 Protocole de Validation (TDD)

### Phase 1 : Test de Blocage (RED)
- Créer un test qui tente d'accéder à `/api/dashboard` sans session.
- **Résultat attendu :** Statut `401 Unauthorized` retourné par le Proxy.

### Phase 2 : Test d'Isolation (RED)
- Créer un test avec une session valide mais sans `organizationId`.
- **Résultat attendu :** Statut `403 Forbidden`.

### Phase 3 : Test de Header (GREEN)
- Simuler une requête via le Proxy.
- **Vérification :** L'API reçue doit posséder le header `x-org-id` correspondant à la session.

---

## 🛡️ Règles de Sécurité (Global Rules Compliance)
- **Immuabilité :** Le `proxy.ts` doit être le seul endroit où l'on définit les routes publiques (ex: `/login`, `/register`, `/api/public`).
- **Fail-Safe :** Par défaut, toute route non explicitement déclarée "publique" doit être BLOQUÉE par le proxy.
- **Logging :** Toute tentative d'accès IDOR (accès à une org interdite) doit être logguée côté serveur.

---

## 📝 Plan d'Exécution pour l'Agent
1. **Analyse :** Scanner le projet pour trouver l'ancien middleware.
2. **Backup :** Sauvegarder la logique d'auth actuelle.
3. **Draft Proxy :** Créer `proxy.ts` avec la nouvelle syntaxe Next.js.
4. **Update Global Rules :** S'assurer que `skills/global-rules.md` pointe désormais vers `proxy.ts`.
5. **Vérification :** Lancer une `/review` pour confirmer qu'aucune route n'est restée "ouverte".