---
name: tesseract-ocr
description: Intégrer ou corriger l'OCR local de SnapSort avec tesseract.js — chargement différé, progression, états d'erreur et fonctionnement hors ligne.
license: MIT
compatibility: opencode
metadata:
  audience: vision
  area: ocr
---

## Quand m'utiliser

Pour toute tâche touchant la reconnaissance de texte : intégration,
optimisation, gestion des échecs, langue, ou mode hors ligne.

## Règles

- **Chargement différé obligatoire.** tesseract.js ne doit être importé qu'à
  l'usage : `const { createWorker } = await import("tesseract.js")`. Le bundle
  initial ne doit pas le contenir.
- **Un worker réutilisé par langue.** Ne pas recréer un worker à chaque image.
  `src/lib/ocr.ts` garde un worker actif et le recrée seulement si la langue
  change.
- **Progression réelle.** Le `logger` de tesseract alimente `onProgress`. L'UI
  affiche un statut lisible (`running`, `done`, `error`, `unavailable`).
- **Jamais relancer inutilement.** Si `photo.ocrStatus === "done"`, ne pas
  relancer. Utiliser `store.analyzePhoto` qui respecte cet état.
- **Grandes images.** Downscaler avant OCR (`downscaleBlob(blob, 1800)`) pour
  borner le temps de calcul.
- **Hors ligne.** Le moteur et les données de langue peuvent être téléchargés
  depuis un CDN au premier usage, puis mis en cache. La démo, elle, utilise des
  résultats pré-calculés et fonctionne sans réseau. Documenter cette nuance.
- **Échec = état lisible.** Un échec réseau ou un canvas indisponible donne
  `ocrStatus: "error"` + `ocrError`, jamais une promesse rejetée non gérée.

## Où

- `src/lib/ocr.ts` — moteur et worker.
- `src/state/store.ts` → `analyzePhoto` — orchestration et persistance.
- `src/components/PhotoInsights.tsx` — affichage et bouton « Analyser ».
