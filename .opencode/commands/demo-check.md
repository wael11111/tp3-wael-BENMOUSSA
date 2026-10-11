---
description: Vérifie que le mode démo fonctionne hors ligne et sans compte.
agent: orchestrator
---

Contrôle le mode démo de SnapSort :

1. Vérifie que `src/lib/demo.ts` génère ses images **localement** (canvas) sans
   asset distant ni `fetch`.
2. Vérifie que les photos de démo portent `source: "demo"` et un `demoNote`
   explicite, et que l'OCR est pré-rempli (pas de faux « analyse en direct »).
3. Vérifie qu'un bouton « Réinitialiser la démo » existe dans les paramètres
   (`store.resetDemo`).
4. Lance `npm run test` et confirme que les tests de démo passent.
5. Résume : ce qui fonctionne hors ligne, ce qui nécessite le réseau (OCR réel
   au premier usage) et pourquoi c'est documenté.
