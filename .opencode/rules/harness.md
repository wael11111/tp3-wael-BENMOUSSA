# Harness OpenCode — mode d'emploi

## Agents

| Agent          | Mode     | Rôle                                                   | Écrit ? |
| -------------- | -------- | ------------------------------------------------------ | ------- |
| `orchestrator` | primary  | Planifie, délègue, intègre, vérifie                    | oui     |
| `frontend`     | subagent | UI, design, accessibilité, animations                  | oui     |
| `vision`       | subagent | OCR, catégories, hashing, analyse locale               | oui     |
| `qa`           | subagent | Tests, cas limites, rapports                           | non     |
| `security`     | subagent | Revue de sécurité, dépendances, secrets                | non     |
| `docs`         | subagent | README, documentation des limites                      | oui     |

## Commandes

`/verify` `/test` `/lint` `/typecheck` `/build` `/audit` `/review`
`/prepare-release` `/demo-check`

## Skills

- `tesseract-ocr` : intégration OCR différée et gestion des échecs.
- `indexeddb-persistence` : schéma, migrations, quota, blobs adressés.
- `snapsort-ui` : direction artistique, tokens, composants.

## Hooks (plugin)

`.opencode/plugins/snapsort-guard.js` :

- **before** : bloque la lecture de `.env*`, `*.pem`, `*.key`, `secrets/`.
- **after** : après une édition dans `src/**`, lance ESLint sur le fichier et
  journalise le résultat dans `.opencode/hooks.log`.
- **session.idle** : rappelle que `npm run verify` doit être vert avant de
  conclure.

## Limites assumées

- La version installée (1.18.x) exécute les plugins en JavaScript/TypeScript.
  Les hooks disponibles sont `tool.execute.before`, `tool.execute.after`,
  `event`, `shell.env`, etc. — pas de hook synchrone bloquant au-delà de ce que
  la doc décrit.
- Pas de MCP activé : aucun serveur MCP n'apporte de valeur ici, la config
  laisse `mcp: {}` volontairement vide plutôt que d'ajouter une décoration.
