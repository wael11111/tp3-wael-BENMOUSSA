---
description: Construit l'application pour la production.
agent: orchestrator
---

Lance `npm run build` (`tsc -b && vite build`). Rapporte la taille des bundles
et signale toute régression notable (par ex. le chunk OCR qui grossit).
