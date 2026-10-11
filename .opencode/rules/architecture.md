# Architecture — SnapSort

## Flux de données

```
Fichier (File)
  → validation (lib/image.validateFile)
  → SHA-256 exact (lib/hashing.sha256Hex)
  → dHash perceptuel (lib/hashing.perceptualHash)
  → blob adressé par contenu : blobs["blob_<sha256>"]
  → Photo (métadonnées) dans photos[]
  → AppStore.importFiles → putPhoto + putBlob + ensureSession
  → UI (pages) lit AppStore via useAppState / useAppStore
```

## Couches

- `src/types.ts` : la source de vérité du domaine. Toute évolution de schéma
  commence ici, puis dans `db/database.ts` (migration) et `state/store.ts`
  (`migratePhotos`).
- `src/db/database.ts` : **seul** module autorisé à parler à IndexedDB.
  Stores : `photos`, `blobs`, `collections`, `history`, `meta`.
- `src/lib/` : fonctions pures ou dépendantes du navigateur, testables.
  Aucune dépendance à React.
- `src/state/store.ts` : orchestration et persistance. Chaque action écrit en
  base **puis** met à jour l'état en mémoire (write-through).
- `src/state/selectors.ts` : dérivations pures (file de tri, stats, recherche,
  doublons, suggestions).
- `src/components/` et `src/pages/` : rendu uniquement. Pas d'appel direct à
  `idb`.

## Décisions structurantes

- **Pas de routeur externe** : routage par hash maison (`src/router.tsx`).
- **Pas de backend** : IndexedDB suffit et garantit le « local d'abord ».
- **Blobs séparés des métadonnées** : on ne charge jamais toutes les images en
  mémoire pour afficher une liste.
- **Session de tri** persistée dans `meta.session` : identifiants d'images +
  taille ; la progression est dérivée, jamais stockée en double.
