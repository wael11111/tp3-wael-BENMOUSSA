---
description: Revue de sécurité (secrets, réseau, dépendances, XSS). Lecture seule.
agent: security
---

Réalise une revue de sécurité de SnapSort :

1. `npm audit --omit=dev` et rapporte les vulnérabilités de production.
2. Cherche des secrets : `rg` sur `sk-`, `AKIA`, `BEGIN PRIVATE KEY`, `.env`.
3. Cherche des fuites réseau d'images dans `src/` : `fetch(`, `XMLHttpRequest`,
   `sendBeacon`, `WebSocket`, `https://`. Les seuls appels tolérés sont ceux de
   tesseract.js.
4. Cherche les vecteurs XSS : `dangerouslySetInnerHTML`, `eval`, `innerHTML`.
5. Vérifie que les agents d'audit ne peuvent pas écrire
   (`.opencode/agents/{qa,security}.md` → `edit: deny`).

Rends un rapport sévérité par sévérité avec fichier, ligne et preuve. Ne
corrige rien : l'orchestrator applique.
