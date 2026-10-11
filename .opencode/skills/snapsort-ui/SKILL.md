---
name: snapsort-ui
description: Direction artistique et système de composants de SnapSort (tokens Tailwind, typographie éditoriale, swipe, accessibilité).
license: MIT
compatibility: opencode
metadata:
  audience: frontend
  area: design
---

## Quand m'utiliser

Pour créer ou retoucher un écran, un composant, une animation, ou pour vérifier
la cohérence visuelle et l'accessibilité.

## Identité

- **Palette** (tokens Tailwind, définis dans `src/styles/index.css`) :
  `cream` (fond), `surface`, `ink` (texte), `muted`, `accent` (persimmon
  `#e0552b`), plus `moss`, `plum`, `gold`, `slate-blue` pour les catégories.
- **Typographie** : titres en `font-display` (serif éditorial), corps en
  `font-sans`, données/OCR en `font-mono`.
- **Composants clés** : `Button` (variants primary/secondary/ghost/danger/
  success), `Card`, `Modal`, `ConfirmDialog`, `Progress`, `CategoryBadge`,
  `PhotoImage`, `EmptyState`, `Toast`, `SwipeCard`.
- **Formes** : rayons généreux (`rounded-2xl`/`rounded-3xl`), ombres douces
  (`--shadow-card`, `--shadow-lift`), hairlines `border-line`.

## Règles de composition

- L'image est la vedette : grande carte, beaucoup d'air, peu de chrome.
- Un seul accent par écran ; le reste en encre sur crème.
- Pas de dégradé décoratif, pas d'emoji-icône, pas de grille de cartes
  identiques sans hiérarchie.
- Animations framer-motion courtes (`0.2–0.42s`), jamais gratuites ; le swipe
  montre immédiatement la décision (Conserver / Inutile / Plus tard).

## Accessibilité

- Focus visible partout (règle globale `:focus-visible`).
- `aria-label` sur boutons icônes ; `role="dialog"` + `aria-modal` sur modales ;
  `role="progressbar"` sur barres.
- Le clavier doit tout permettre : `→`/`K` conserver, `←`/`X` inutile,
  `↓`/`L` plus tard, `C` classer, `U`/`Ctrl+Z` annuler.
- Toute action swipe a un bouton équivalent visible.
