---
description: Vérifie les types TypeScript en mode strict.
agent: orchestrator
---

Lance `npm run typecheck` (`tsc -b --noEmit`). Corrige chaque erreur sans
introduire de `any`, de `@ts-ignore` ni de cast non justifié. Relance la
commande jusqu'à obtenir zéro erreur.
