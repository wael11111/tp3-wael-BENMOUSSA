---
name: indexeddb-persistence
description: Faire évoluer la persistance locale de SnapSort (schéma IndexedDB, migrations, blobs adressés par contenu, quota, reset).
license: MIT
compatibility: opencode
metadata:
  audience: vision, frontend
  area: storage
---

## Quand m'utiliser

Pour ajouter un champ au domaine, un store, une migration, ou pour diagnostiquer
un problème de persistance/quota.

## Règles

- **Un seul point d'accès.** Toute lecture/écriture IndexedDB passe par
  `src/db/database.ts`. Aucun composant n'importe `idb` directement.
- **Schéma.** Stores : `photos` (index `by-decision`, `by-importedAt`,
  `by-exactHash`, `by-collection`), `blobs`, `collections`, `history`, `meta`.
- **Évolution.** Nouveau champ → l'ajouter dans `src/types.ts`, dans les
  valeurs par défaut de création (`importFiles`, `importDemo`), dans
  `migratePhotos` (assainissement des anciennes données), et dans un test.
  Incrémenter `SCHEMA_VERSION` seulement si la structure change.
- **Blobs adressés par contenu.** La clé est `blob_<sha256>`. Deux doublons
  exacts partagent le même blob. `deletePhoto(id, deleteBlob)` ne supprime le
  blob que si plus aucune photo ne le référence.
- **Write-through.** Une action écrit en base **puis** met à jour l'état mémoire.
  On ne perd jamais une décision confirmée par un rafraîchissement.
- **Corruption.** `migratePhotos` valide chaque champ et remplace les valeurs
  invalides par des valeurs sûres. Aucune exception ne doit remonter.
- **Quota.** `estimateUsage` alimente un avertissement quand l'usage dépasse
  85 % du quota. Ne jamais supprimer de données automatiquement.

## Test

`src/state/store.test.ts` utilise `fake-indexeddb`. Toujours couvrir : import,
persistance après ré-instanciation, corruption, blob partagé, reset.
