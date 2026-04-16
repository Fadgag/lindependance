# 🧪 Next.js Code Review Report - V7

## 🧾 Summary
- **Score:** 90/100
- **Verdict:** ⚠️ CHANGES REQUIRED
- **Stats:** Critical: 0 | Major: 1 | Minor: 2
- **Scope:** Branche `fix/mobile-hide-sidebar` — diff vs `main`
- **Fichiers audités (diff uniquement) :**
  - `src/components/layout/Sidebar.tsx` ← seul fichier de code source modifié
  - `skills/reviewer.skill.md` ← meta, non audité sur qualité code
  - `quality/review_report/review_V6.md` ← meta, non audité sur qualité code

---

## 🔴 Critical Issues (Blocking)
_Aucun issue critique détecté dans le diff de cette branche._

---

## 🟠 Major Issues

### [A11Y / UX] Sidebar rendue invisible sur mobile mais toujours dans le DOM — aria-hidden manquant

**Problem :**
`hidden md:flex` masque visuellement la sidebar via Tailwind CSS, mais l'élément `<aside>` reste présent dans le DOM et est accessible aux lecteurs d'écran (screen readers) sur mobile. Cela peut provoquer une double navigation pour les utilisateurs avec assistive technologies : le contenu de la Sidebar (liens, bouton Quitter) sera lu deux fois ou accessible au clavier via Tab malgré l'invisibilité visuelle.

**Fichier :** `src/components/layout/Sidebar.tsx` — ligne 24

**Fix recommandé :**
Ajouter `aria-hidden` conditionnel via JavaScript côté client, **ou** (solution plus simple) vérifier que Tailwind génère bien `display: none` avec `hidden` (ce qui est le cas — `display: none` exclut le noeud du flow AT). ✅ En réalité `hidden` = `display: none` en Tailwind, qui retire l'élément de l'arbre d'accessibilité. Risque atténué.

**Verdict révisé :** Minorer à ⚠️ MINOR si l'usage de `hidden` est confirmé comme `display:none` (ce qui est le cas avec Tailwind `hidden`). Aucun patch bloquant.

> ℹ️ Note : Après vérification, `hidden` en Tailwind CSS correspond à `display: none` — l'élément est retiré du rendu ET de l'arbre d'accessibilité. Ce point est **mineur** en pratique. Rétrogradé ci-dessous.

---

## 🟡 Minor Issues

### [MINOR 1] Aucun test de régression pour le comportement responsive Sidebar/MobileHeader

**Problem :**
Il n'existe aucun test vérifiant que :
- La `Sidebar` est bien masquée sur mobile (`hidden md:flex`)
- Le `MobileHeader` (burger) est bien visible sur mobile (`flex md:hidden`)
- Le `MobileSheet` s'ouvre correctement au clic sur le burger

Le fichier `test/ui/MobileHeader.spec.tsx` est absent du projet.

**Impact :** Une future modification pourrait involontairement casser le comportement responsive sans que les tests le détectent.

**Fix recommandé :**
Créer `test/ui/MobileHeader.spec.tsx` avec au minimum :
```ts
it('renders burger button on mobile', () => { ... })
it('opens MobileSheet on burger click', () => { ... })
it('closes sheet on backdrop click', () => { ... })
```

---

### [MINOR 2] `layout.tsx` — `pt-16 md:pt-0` doit être cohérent avec le z-index du MobileHeader

**Problem :**
`<main className="... pt-16 md:pt-0">` — le `pt-16` compense la hauteur du header mobile fixe (`h-16`). C'est correct et cohérent. Toutefois, ce couplage implicite (hauteur header = padding main) est fragile : si la hauteur du `MobileHeader` change, il faudra mettre à jour `layout.tsx` manuellement.

**Fix recommandé (optionnel) :**
Extraire la hauteur en CSS variable : `--mobile-header-h: 4rem` et utiliser `pt-[var(--mobile-header-h)]` pour rendre le couplage explicite.

---

## 🧠 Global Recommendations

1. **Tests responsive** : Ajouter un test Vitest/RTL pour `MobileHeader` + `MobileSheet` (scénario open/close) et un test vérifiant que `Sidebar` ne s'affiche pas en viewport mobile.
2. **CSS variable hauteur header** : Centraliser `h-16` / `pt-16` dans une variable CSS pour éviter les désynchronisations futures.
3. **Cleanup** : Le commentaire dans le `<aside>` (`// Hidden on mobile...`) est en JavaScript comment (`//`) dans du JSX — valide syntaxiquement, mais convention préférable : `{/* Hidden on mobile... */}`.

---

## 🧩 Refactoring Plan (Pour l'AutoFixer)

1. **Priorité 1 :** Ajouter `test/ui/MobileHeader.spec.tsx` (Minor 1).
2. **Priorité 2 :** Corriger le commentaire JS inline en JSX comment `{/* */}` dans `Sidebar.tsx`.
3. **Priorité 3 (optionnel) :** Extraire la hauteur du header en CSS variable.

---

## 🧮 Final Decision

**✅ APPROVED** — Le changement est correct, sûr, et résout le bug mobile (sidebar visible en mobile). Les issues identifiées sont mineures et n'ont aucun impact sécurité. Branche prête pour merge après optionnellement ajout du test de non-régression.

