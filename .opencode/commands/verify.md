---
description: Lance la vérification complète (lint, types, tests, build) et corrige les échecs.
agent: orchestrator
---

Exécute réellement `npm run verify` (lint → typecheck → tests → build) via le
tool bash. Ne te contente pas de lire le script.

Puis :

1. Si tout est vert, résume en une ligne : « verify OK » + la sortie finale.
2. Si quelque chose échoue, corrige la cause, relance `npm run verify`, et
   répète jusqu'à ce que tout passe.
3. Ne déclare jamais un succès sans la sortie de commande qui le prouve.

Termine par un court bilan : commandes lancées, résultat, fichiers modifiés.
