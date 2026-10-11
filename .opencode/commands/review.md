---
description: Revue de code ciblée sur les invariants SnapSort. Lecture seule.
agent: security
---

Relis les changements récents (`git diff` sur `src/`) et vérifie le respect des
invariants de `.opencode/rules/invariants.md` :

- Persistance avant retour (décision écrite en base avant l'état).
- Idempotence des décisions et partage des blobs adressés par contenu.
- Dégradation gracieuse (pas d'écran blanc, promesses gérées).
- Honnêteté de l'IA (confiance affichée, démo étiquetée).
- Suppression ≠ fichier original.

Rapporte les violations avec fichier et ligne. Ne corrige rien.
