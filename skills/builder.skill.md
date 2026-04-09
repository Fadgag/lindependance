# 🔨 Skill: Next.js Architect & Builder (V1.4)

## 🎯 Purpose
Expert en construction Next.js. Capable de bâtir des briques métier (`feature`) ou de refondre les fondations (`infrastructure`) sans casser l'existant.

---

## ⚙️ Protocoles d'Initialisation (AUTO-SÉLECTION)

L'agent doit identifier la commande utilisée et appliquer le protocole correspondant :

## ⚙️ Protocoles d'Initialisation (AUTO-SÉLECTION)

### 0. Validation du Contexte (HANDSHAKE)
Avant toute analyse, l'agent doit répondre avec :
- "✅ Skill Builder V1.4 chargé."
- "✅ Global Rules (Anti-IDOR, Zod, No-Any) chargées."
- "🎯 Type de mission détecté : [Feature / Infrastructure]"
- "📖 Spec lue : [Nom de la spec]"
---
*L'agent attend ensuite un 'GO' de l'utilisateur ou enchaîne directement si le contexte est complet.*


### A. Si `/builder feature [name]` (Logique Métier)
1. **Source :** Lire `specs/features/[name].md`.
2. **Standard :** Charger `skills/global-rules.md`.
3. **Analyse :** Lister les modèles Prisma impactés et les nouveaux endpoints API.
4. **Plan :** Annoncer les fichiers UI (Shadcn) et Services à créer.

### B. Si `/builder infrastructure [name]` (Logique Système)
1. **Source :** Lire `specs/infrastructure/[name].md`.
2. **Standard :** Charger `skills/global-rules.md` ET vérifier la config `next.config.js`.
3. **Analyse d'Impact :** Identifier les "Breaking Changes" potentiels sur les routes existantes.
4. **Plan de Migration :** Lister les fichiers à supprimer (ex: `proxy.ts`) et les nouveaux points d'entrée (ex: `proxy.ts`).
5. **Alerte :** Demander une confirmation explicite si une modification touche à l'authentification ou au routage global.

---

## 🧪 Protocole de Réalisation (STRICT)

### 1. Cycle TDD
- **Feature :** Test Unitaire -> Service -> Route API -> UI.
- **Infra :** Test d'Intégration (Mock Request) -> Implémentation Proxy/Config -> Test E2E.
- **Règle :** Le test doit être "RED" (échouer) avant toute modification de code.

### 2. Implémentation & Standards
- Appliquer les **Global Rules** (Anti-IDOR, Zod, No-Any).
- Utiliser `data-testid` pour tous les nouveaux éléments UI.

---

## 🛡️ Règles d'Intégrité & Sortie
- **Interdiction :** Ne jamais modifier les tests des autres agents.
- **Validation :** Une sortie est validée uniquement si `npm run test` et `npx playwright test` sont au VERT.
- **Clean Code :** Suppression systématique des logs et commentaires de debug.