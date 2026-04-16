# 🧪 Next.js Code Review Report - V16

## 🧾 Summary
- **Score:** 28/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 2 | Major: 4 | Minor: 4
- **Branche analysée :** `feature/dashboard-upgrade-billing` (diff vs `main`)
- **Fichiers audités :** `prisma/schema.prisma`, `src/app/api/dashboard/summary/route.ts`, `src/app/api/test/create-billing-test-data/route.ts`, `src/app/dashboard/details/page.tsx`, `src/services/dashboard.service.ts`, `src/components/dashboard/DashboardShell.tsx`, `tests/e2e/billing-accuracy.spec.ts`

---

## 🔴 Critical Issues (Blocking)

### [SÉCURITÉ/IDOR] Route `/api/dashboard/summary` : bypass IDOR via `orgId` query param
**Violation :** `global-rules.md` — "Aucune donnée ne doit être lue ou écrite sans vérifier l'appartenance à `session.organizationId`."
**Impact :** Si `TEST_API_KEY` est défini en production (ou fuité), n'importe quel client peut passer `?orgId=<target_org_id>` pour lire le CA complet d'une organisation tierce. Fuite CA + nombre de RDV + liste de produits → violation directe de l'isolation multi-tenant.
**Fichier :** `src/app/api/dashboard/summary/route.ts` lignes 12–14
```typescript
// ❌ FAILLE : un attaquant avec TEST_API_KEY peut read n'importe quel orgId
if (testKey && testKey === process.env.TEST_API_KEY) {
  orgId = url.searchParams.get('orgId') ?? undefined
```
**Fix :** Supprimer totalement le bypass `orgId` côté production. La route de test ne doit exister QUE dans `NODE_ENV !== 'production'`. En alternatif : ne jamais lire `orgId` depuis les query params en production.

---

### [SÉCURITÉ] Route `/api/test/create-billing-test-data` : accessible en production
**Violation :** `global-rules.md` — isolation des données + principe de moindre privilège.
**Impact :** La route crée de vraies `Organization`, `Service`, `Product`, `Customer`, `Appointment` en base Neon si `TEST_API_KEY` est défini et connu. En production, cela pollue la DB réelle, génère des données orphelines, et pourrait être utilisé pour du data-stuffing.
**Fichier :** `src/app/api/test/create-billing-test-data/route.ts` lignes 4–8
```typescript
// ❌ Aucun guard NODE_ENV
export async function POST(req: Request) {
  const testKey = req.headers.get('x-test-api-key')
  if (!process.env.TEST_API_KEY || testKey !== process.env.TEST_API_KEY) {
```
**Fix AutoFixer :**
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'not available' }, { status: 404 })
}
```
Ajouter cette garde EN PREMIER dans le handler, avant tout autre check.

---

## 🟠 Major Issues

### [TYPE SAFETY] Usage de `any` dans `dashboard.service.ts`
**Problem :** `(a as any).soldProductsJson` — violation stricte de la règle `any` zero-tolerance dans `global-rules.md`. Le `eslint-disable` masque la violation sans la corriger.
**Fichier :** `src/services/dashboard.service.ts` ligne 233
**Fix :** Définir un type intermédiaire `AppointmentWithOptionalJsonField` qui étend le type Prisma avec le champ optionnel :
```typescript
type AppointmentRow = Prisma.AppointmentGetPayload<{...}> & { soldProductsJson?: unknown }
const rawSold = ((a as AppointmentRow).soldProductsJson ?? a.soldProducts) as unknown
```
Documenter avec `// RAISON: champ soldProductsJson ajouté en migration, non encore présent dans le client Prisma généré`.

### [SÉCURITÉ/NULL] `redirect()` ne lève pas d'exception dans les Server Components Next.js 15+
**Problem :** `redirect('/auth/signin')` en Next.js 15+ App Router ne fait pas de `throw`, il retourne un Response de redirection mais l'exécution du code continue. Ligne 12 suivante : `const orgId = session.user.organizationId as string` plantera si `organizationId` est null.
**Fichier :** `src/app/dashboard/details/page.tsx` ligne 10–12
```typescript
if (!session?.user?.organizationId) redirect('/auth/signin')
// ❌ Le code continue si redirect() ne jette pas
const orgId = session.user.organizationId as string // null possible
```
**Fix :**
```typescript
if (!session?.user?.organizationId) {
  redirect('/auth/signin')
  return null // guard TypeScript
}
const orgId = session.user.organizationId // RAISON: guard effectué ci-dessus
```

### [VALIDATION] Absence de validation Zod sur les `searchParams` de la page details
**Problem :** `searchParams.from`, `.to`, `.filter` sont utilisés directement sans validation Zod. Un paramètre malformé (`from=not-a-date`) provoquerait une `Invalid Date` qui traverserait silencieusement toute la chaîne service→Prisma.
**Fichier :** `src/app/dashboard/details/page.tsx` lignes 14–17
**Fix :** Valider avec un schema Zod avant utilisation :
```typescript
const SearchSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  filter: z.enum(['all', 'services', 'products']).default('all')
})
const parsed = SearchSchema.safeParse(searchParams)
if (!parsed.success) redirect('/dashboard')
```

### [SPEC INCOMPLETE] Filtre "Prestations uniquement / Ventes uniquement" non implémenté côté UI
**Problem :** La spec `dashboard-upgrade.md` exige explicitement des boutons de filtre rapide sur la page details. Actuellement la page `/dashboard/details` n'affiche aucun contrôle de filtre — le `filter` param n'est accessible que par URL manuelle.
**Fichier :** `src/app/dashboard/details/page.tsx`
**Fix :** Ajouter une barre de filtres cliquables (composant client) en haut du tableau :
```tsx
// Composant client pour les filtres
<FilterBar currentFilter={filter} />
// Boutons : "Tous" | "Prestations uniquement" | "Ventes uniquement"
```

---

## 🟡 Minor Issues

- **`billing-accuracy.spec.ts`** : Fichier `.ts` qui utilise `require()` (CommonJS). Inconsistant et cassera avec les outils ES module stricts. Renommer en `.js` ou utiliser l'import ESM.
- **Artefact de patch** : `// ...existing code...` visible ligne 3 de `src/app/dashboard/details/page.tsx` — résidu de l'outil de patching qui doit être supprimé.
- **Accessibilité** : `tabIndex={0}` et `role="button"` ajoutés sur **tous** les KPI cards dans `DashboardShell.tsx`, mais les cards "Rendez-vous" et "Nouveaux Clients" ne sont pas cliquables → trompeur pour les lecteurs d'écran.
- **Branch morte** dans `getDashboardDetails` : le bloc `if (filter === 'services')` est vide (commentaire seul). Soit implémenter (`status: 'PAID'` uniquement) soit supprimer le `if`.

---

## 🧠 Global Recommendations

1. **Migration Prisma non exécutée** : `soldProductsJson` et `productsTotal` sont dans le schema mais pas encore migrés vers Neon. Exécuter `npx prisma migrate deploy` avant tout déploiement. Les `$executeRawUnsafe` utilisés pour contourner le typage stale sont une dette technique à solder dès la regénération du client.
2. **Playwright config manquante** : Aucun `playwright.config.ts` présent dans le repo. Le test e2e ne peut pas s'exécuter avec `npx playwright test` sans cette config.
3. **Variables d'env test** : `TEST_API_KEY` doit être documenté dans `.env.example` comme variable test-only, et JAMAIS définie en production. Ajouter une vérification dans `check-nextauth-secret.js` ou un script séparé.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 (Sécurité)** :
   - `src/app/api/test/create-billing-test-data/route.ts` : Ajouter `NODE_ENV === 'production'` guard en première ligne.
   - `src/app/api/dashboard/summary/route.ts` : Supprimer le bypass `orgId` ou le conditionner strictement à `NODE_ENV !== 'production'`.
2. **Priorité 2 (Types/Zod)** :
   - `src/services/dashboard.service.ts` : Remplacer `(a as any)` par un type intersection documenté.
   - `src/app/dashboard/details/page.tsx` : Ajouter validation Zod des searchParams + guard post-redirect.
3. **Priorité 3 (Clean Code/Spec)** :
   - Ajouter `FilterBar` client component sur la page details.
   - Supprimer l'artefact `// ...existing code...` dans details/page.tsx.
   - Corriger le `tabIndex` des cards non-cliquables.
   - Renommer `billing-accuracy.spec.ts` → `.js` ou convertir en ESM.
   - Créer `playwright.config.ts`.

---

## 🧮 Final Decision

**REJECTED** — 2 failles de sécurité critiques (IDOR + route de test en production) bloquent tout déploiement. L'AutoFixer doit traiter en priorité absolue les items Sécurité avant merge.

