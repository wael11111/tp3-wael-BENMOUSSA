---
description: Prépare une livraison (verify vert + résumé des fichiers modifiés).
agent: orchestrator
---

État Git actuel :

!`git status --short 2>/dev/null || echo "dépôt non initialisé"`

Prépare la livraison :

1. Lance `npm run verify`. Corrige jusqu'à obtenir un vert réel.
2. Liste les fichiers modifiés et résume chaque changement en une ligne.
3. Vérifie qu'aucun secret ni fichier de build (`dist/`, `coverage/`,
   `node_modules/`, `playwright-report/`) n'est prêt à être committé.
4. Ne committe **pas** sans demande explicite de l'utilisateur.
