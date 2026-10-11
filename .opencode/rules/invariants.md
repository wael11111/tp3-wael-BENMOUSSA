# Invariants produit — SnapSort

Ces règles ne sont pas négociables. Toute contribution qui les casse est
refusée par l'orchestrator.

1. **Local d'abord.** Aucune image personnelle n'est envoyée à un serveur.
   Pas de clé API requise. L'app démarre et la démo fonctionne hors ligne après
   `npm install`. Seul l'OCR peut, au premier usage, télécharger ses fichiers de
   langue — c'est documenté dans l'UI et le README.
2. **Persistance avant retour.** Une décision de tri est écrite dans IndexedDB
   avant que l'interface ne la considère comme acquise. Recharger la page ne
   perd aucune décision confirmée.
3. **Idempotence.** Rejouer la même décision ne crée pas d'état incohérent.
   Les blobs sont adressés par contenu et partagés entre doublons exacts ; un
   blob n'est supprimé que lorsque plus aucune photo ne le référence.
4. **Dégradation gracieuse.** Jamais d'écran blanc. Données corrompues →
   assainies au chargement (`migratePhotos`). Blob manquant → fallback visuel.
   OCR indisponible → statut `error` lisible. Quota → avertissement.
5. **Honnêteté de l'IA.** Jamais « IA active » sans traitement réel. Une
   suggestion incertaine est affichée avec sa confiance ; sous 50 % elle est
   signalée comme incertaine. Les données de démo portent le libellé
   « démonstration ».
6. **Suppression ≠ fichier original.** L'UI ne doit jamais laisser croire que
   retirer une image supprime le fichier de l'ordinateur.
7. **Pas de secret.** Aucune clé, aucun token, aucune donnée personnelle dans le
   dépôt. Le plugin `snapsort-guard` bloque la lecture des fichiers sensibles.
