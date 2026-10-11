# Conventions de code — SnapSort

- TypeScript **strict**. Options actives : `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`.
- **Interdit** : `any` implicite, `@ts-ignore`, `as any`, `!` non justifié.
- Type imports explicites : `import type { Photo } from "@/types"`.
- Alias `@/` → `src/`. Jamais d'import relatif remontant (`../../`).
- Pas de commentaires, sauf pour expliquer une décision non évidente.
- Nommage : composants `PascalCase.tsx`, modules `camelCase.ts`, tests
  `*.test.ts(x)`, e2e `*.spec.ts`.
- Tailwind uniquement, via les tokens du thème (`bg-cream`, `text-ink`,
  `text-accent`…). Pas de couleur codée en dur hors tokens, sauf pour les
  couleurs de catégories/collections venant des données.
- Accessibilité obligatoire : tout bouton icône a un `aria-label`, les
  dialogues ont `role="dialog"` + `aria-modal`, les barres de progression ont
  `role="progressbar"`.
- UI et messages en français, ton clair et direct.

## Tests

- Unitaire : `src/**/*.test.ts(x)` sous Vitest + jsdom.
- Intégration : `src/state/store.test.ts` couvre import, décisions,
  annulation, sessions, collections, corruption, quota/quota vide.
- Ne jamais mocker ce qu'on veut tester (ex. garder `sha256Hex` réel).
- e2e Playwright : `e2e/*.spec.ts`, parcours import → tri → persistance.

## Définition de « terminé »

1. `npm run lint` sans erreur.
2. `npm run typecheck` sans erreur.
3. `npm run test` vert.
4. `npm run build` réussi.
5. Le comportement ajouté est couvert par un test ou un parcours e2e.
