# 🧪 Next.js Code Review Report - V10

> Scope : Modifications apportées dans la session courante (16 avril 2026)
> Fichiers audités :
> - `src/app/api/appointments/route.ts`
> - `src/app/api/appointments/[id]/checkout/route.ts`
> - `src/app/api/customers/route.ts`
> - `src/components/dashboard/CheckoutModal.tsx`
> - `src/app/customers/[id]/page.tsx`

---

## 🧾 Summary
- **Score:** 62/100
- **Verdict:** ❌ BLOCK
- **Stats:** Critical: 1 | Major: 4 | Minor: 5

---

## 🔴 Critical Issues (Blocking)

### [SECURITY] Checkout POST sans validation Zod — injection libre de payload
**Violation :** `global-rules.md` — "Toute donnée provenant de l'extérieur (API Request, SearchParams) doit être validée par un schéma Zod avant traitement."
**Impact :** L'endpoint `POST /api/appointments/[id]/checkout` fait un `request.json()` brut et destructure directement `{ totalPrice, extras, note, paymentMethod, soldProducts }` sans aucune validation de schéma. Un attaquant peut :
- Envoyer `totalPrice: 0` pour encaisser un RDV à 0 €.
- Injecter un `soldProducts` arbitraire avec de faux `productId` (contournement du stock).
- Injecter des `extras` de taille illimitée (DoS payload).

**Fix :**
1. Créer `CheckoutInputSchema` dans `src/schemas/appointments.ts` :
```typescript
export const CheckoutInputSchema = z.object({
  totalPrice: z.number().min(0),
  paymentMethod: z.enum(['CB', 'CASH', 'CHECK']),
  note: z.string().max(2000).optional().nullable(),
  extras: z.array(z.object({ label: z.string().max(200), price: z.number() })).optional(),
  soldProducts: z.array(z.object({
    productId: z.string().cuid(),
    name: z.string(),
    iconName: z.string(),
    quantity: z.number().int().positive().max(999),
    priceTTC: z.number().min(0),
    taxRate: z.number(),
    totalTTC: z.number().min(0),
    totalTax: z.number().min(0),
  })).optional(),
})
```
2. Remplacer le `request.json()` brut par `CheckoutInputSchema.safeParse(await request.json())` avec retour 400 si invalide.

---

## 🟠 Major Issues

### [TYPES] `as unknown as Record<string, unknown>` — contournement déguisé du type Prisma
**Problem :** Dans `src/app/api/appointments/route.ts` (lignes 63–84), les champs `extras` et `soldProducts` sont accédés via `(a as unknown as Record<string, unknown>).extras`. C'est un double cast qui contourne le typage Prisma car ces champs **existent bien** dans le modèle `Appointment` (voir `schema.prisma` lignes 87–88). Le vrai problème est que `findMany` utilise `include: { service, customer }` sans `select`, donc tous les champs scalaires sont présents dans le type généré. Le cast est inutile et masque le fait que Prisma type déjà ces champs.
**Fix :** Supprimer le cast ; accéder directement à `a.extras` et `a.soldProducts` (les champs sont `String?` dans Prisma → TypeScript les voit en `string | null`). La logique de parsing reste inchangée mais sans cast.
```typescript
extras: (() => {
    try { return a.extras ? JSON.parse(a.extras) : null } catch { return null }
})(),
soldProducts: (() => {
    try { return a.soldProducts ? JSON.parse(a.soldProducts) : null } catch { return null }
})(),
```

### [ARCHITECTURE] Logique métier de parsing JSON inline dans l'API Route (DRY)
**Problem :** Le parsing de `extras` et `soldProducts` (JSON string → array) est dupliqué 4 fois dans `route.ts` (top-level + extendedProps), puis à nouveau dans `CheckoutModal.tsx` (fonctions `extractExtras`, `extractSoldProducts`) et dans `page.tsx`. Violation du principe DRY et de la règle "logique métier dans `@/services`".
**Fix :**
1. Extraire une fonction utilitaire dans `src/lib/parseAppointmentJson.ts` :
```typescript
export function parseJsonField<T>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed as T[] : [] }
  catch { return [] }
}
```
2. Utiliser cette fonction dans le route ET dans le modal (importer côté client ou dupliquer en fichier client si nécessaire).

### [TYPES] `(apt.soldProducts as unknown)` dans `page.tsx` — narrowing incomplet
**Problem :** Dans `src/app/customers/[id]/page.tsx`, `apt.soldProducts` est casté en `unknown` puis parsé sans narrowing typé. `apt` est de type `CheckoutAppointment` qui déclare `soldProducts?: string | SoldProduct[]` — utiliser le type directement sans cast est possible et safer.
**Fix :** Retirer le cast, utiliser directement `apt.soldProducts` et la logique de narrowing sur `string | SoldProduct[] | undefined`.

### [ARCHITECTURE] `CheckoutModal.tsx` dépasse 460 lignes — composant monolithique
**Problem :** Le composant principal `CheckoutModal` fait 466 lignes. La règle `global-rules.md` (indirectement via reviewer skill) impose < 200 lignes par composant. Le picker produit (logique recherche + récents + rendu) devrait être extrait dans `src/components/dashboard/ProductPicker.tsx`.
**Fix :** Extraire le bloc "product picker" (états `searchQuery`, `debouncedQuery`, `recentProductIds`, `useMemo`, rendu dropdown) dans un composant `ProductPicker` avec props `{ products, onSelect }`.

---

## 🟡 Minor Issues

- **[A11Y]** Le dropdown product picker dans `CheckoutModal` n'a pas d'attributs ARIA (`role="listbox"`, `role="option"`, `aria-expanded`). Navigation clavier impossible.
- **[A11Y]** Aucune gestion du `onKeyDown` (Escape pour fermer le picker) ni de `aria-activedescendant` pour la navigation flèches.
- **[LINT]** `src/app/customers/[id]/page.tsx` : warnings Tailwind (`bg-[#FAF9F6]` → `bg-studio-bg`, `rounded-[2rem]` → `rounded-4xl`). Non bloquant mais pollue le linting.
- **[LINT]** `src/components/dashboard/CheckoutModal.tsx` : warnings `z-[100]` → `z-100`, `min-h-[80px]` → `min-h-20`.
- **[UX]** Section "Populaires" affichée même quand `searchQuery` est non vide — si l'utilisateur tape une recherche, les récents restent affichés en haut ce qui est redondant. Masquer les récents quand `debouncedQuery` est non vide.

---

## 🧠 Global Recommendations

1. **Schéma Zod pour checkout** est la priorité absolue — un `totalPrice: 0` sans validation est un vrai risque métier en production.
2. **Prisma génère les types** — les `as unknown as Record<string, unknown>` sont symptomatiques d'un incompréhension du type généré par `findMany` avec `include`. Passer en revue les autres routes pour détecter des patterns similaires.
3. **Extraction `ProductPicker`** : le composant devient testable unitairement seulement s'il est extrait. Actuellement aucun test ne peut couvrir la logique recherche/récents sans monter toute la `CheckoutModal`.
4. **`parseJsonField` util** : centraliser le parsing des colonnes JSON Prisma (`extras`, `soldProducts`) évite les 4+ duplications actuelles et les risques de divergence.
5. **Test E2E manquant** : le flux `ajouter produit → encaisser → historique client affiche produit` n'est couvert par aucun test Playwright. C'est un flux métier critique.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 — Sécurité :** Ajouter `CheckoutInputSchema` dans `src/schemas/appointments.ts` et l'appliquer dans `src/app/api/appointments/[id]/checkout/route.ts`.
2. **Priorité 2 — Types :** Supprimer les casts `as unknown as Record<string, unknown>` dans `route.ts` ; accéder directement à `a.extras` et `a.soldProducts` (string | null).
3. **Priorité 3 — DRY :** Créer `src/lib/parseAppointmentJson.ts` et remplacer les duplications dans route, modal et page client.
4. **Priorité 4 — Architecture :** Extraire `ProductPicker` dans son propre fichier `src/components/dashboard/ProductPicker.tsx`.
5. **Priorité 5 — Minor :** Corriger les classes Tailwind arbitraires, ajouter ARIA sur le picker, masquer récents quand recherche active.

---

## 🧮 Final Decision

**REJECTED** — 1 issue critique (absence de validation Zod sur checkout = risque encaissement à 0 €) bloque le merge. Appliquer Priorité 1 en premier, puis re-review.

