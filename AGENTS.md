# SnapSort — règles du dépôt

SnapSort est une application web de tri intelligent de photos. Ce fichier est lu
automatiquement par OpenCode : il fait autorité pour tous les agents.

## Ce que fait le produit

L'utilisateur importe ses images (JPEG, PNG, WebP), puis les trie une à une au
swipe ou au clavier : **Conserver**, **Classer** dans une collection,
**Revoir plus tard**, **Inutile**. Une analyse locale (OCR + heuristiques +
hash perceptuel) propose des catégories, détecte les doublons et suggère une
collection. Tout reste dans le navigateur.

## Stack et structure

- **React 19 + TypeScript strict + Vite 7**, **Tailwind CSS 4**, **framer-motion**.
- **Vitest + React Testing Library** (unitaire/intégration), **Playwright** (e2e).
- Persistance locale : **IndexedDB** via `idb`. OCR : **tesseract.js** (chargé à la demande).

```
src/
  types.ts            Domaine : Photo, Collection, Settings, Suggestion, RecipeData
  db/database.ts      Accès IndexedDB, migrations, quota, reset
  lib/
    hashing.ts        SHA-256 (doublons exacts) + dHash (similaires)
    classify.ts       Heuristiques de catégorie, extraction de recette, suggestions
    ocr.ts            Chargement différé de tesseract.js
    image.ts          Validation, dimensions, downscale
    demo.ts           Jeu de démonstration généré en canvas (hors ligne)
  state/
    store.ts          AppStore : état + actions + persistance
    selectors.ts      Données dérivées (file, stats, recherche, doublons)
    useStore.ts       Hooks React (useSyncExternalStore, usePhotoUrl)
  components/         UI réutilisable
  pages/              Écrans (Home, Import, Sort, Collections, Search, Stats, Settings)
```

## Invariants — à ne jamais casser

1. **Local d'abord.** Aucune image ne quitte le navigateur. Pas de clé API, pas
   de service externe indispensable au démarrage. L'OCR peut télécharger ses
   fichiers de langue, mais l'app et la démo fonctionnent sans réseau.
2. **Persistance réelle.** Chaque décision est écrite dans IndexedDB *avant* de
   rendre la main. Un rafraîchissement ne perd jamais une décision confirmée.
3. **Idempotence.** Décider deux fois de suite la même image ne doit pas créer
   d'état incohérent. Les blobs sont adressés par contenu (`blob_<sha256>`) et
   partagés ; un blob n'est supprimé que s'il n'est plus référencé.
4. **Dégradation gracieuse.** Données corrompues → assainies au chargement.
   Blob manquant → fallback visuel. OCR indisponible → statut `error` lisible.
   Quota plein → avertissement. Jamais d'écran blanc, jamais de promesse rejetée
   non gérée.
5. **L'IA ne ment pas.** On n'affiche jamais « IA active » sans traitement réel.
   Une suggestion incertaine est affichée comme telle (confiance < 50 %).
   Les données de démo sont explicitement étiquetées « démonstration ».
6. **Suppression ≠ fichier original.** Retirer une image de SnapSort ne supprime
   jamais le fichier de l'ordinateur. Le texte de l'UI doit rester explicite.

## Conventions de code

- TypeScript **strict** avec `exactOptionalPropertyTypes` et
  `noUncheckedIndexedAccess`. Pas de `any` implicite, pas de `@ts-ignore`.
- **Aucun commentaire** sauf s'il explique une décision non évidente.
- Imports via l'alias `@/`. Type imports explicites (`import type`).
- Les composants sont fonctionnels ; l'état vit dans `AppStore`, pas dans un
  contexte React parallèle.
- Les URL d'objet (`URL.createObjectURL`) sont **toujours** révoquées
  (voir `usePhotoUrl`).
- UI en français, accessible : focus visibles, navigation clavier, contrastes
  suffisants, `aria-*` pertinents.

## Commandes de vérification

```bash
npm run lint       # ESLint
npm run typecheck  # tsc -b --noEmit
npm run test       # Vitest (unitaire + intégration)
npm run build      # tsc -b && vite build
npm run verify     # tout, dans cet ordre
npm run e2e        # Playwright (nécessite npm run e2e:install)
```

## Règles de collaboration entre agents

- L'`orchestrator` planifie, délègue et **intègre**. Il relit tout diff avant de
  le considérer comme acquis.
- `frontend` et `vision` écrivent du code, mais jamais le même fichier en
  parallèle. En cas de conflit, l'orchestrator séquence.
- `qa` et `security` sont **en lecture seule** : ils rapportent, ils ne corrigent
  pas. C'est l'orchestrator qui applique les correctifs.
- Avant de déclarer une tâche terminée : exécuter `npm run verify`. Ne jamais
  affirmer qu'un test passe sans l'avoir réellement lancé.
- Ne jamais committer de secret ni de clé API.
