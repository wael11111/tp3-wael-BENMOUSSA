/**
 * SnapSort harness plugin — hooks réels, pas décoratifs.
 *
 * - tool.execute.before : bloque la lecture de fichiers sensibles et les
 *   commandes destructrices.
 * - tool.execute.after  : après une édition dans src/**, lance ESLint sur le
 *   fichier et journalise le résultat dans .opencode/hooks.log.
 * - event               : à la fin d'une session, rappelle la vérification.
 *
 * Le plugin ne doit JAMAIS casser la session : tout est encapsulé en try/catch.
 */

const SENSITIVE = /(^|\/)(\.env(\..*)?|.*\.(pem|key|p12)|secrets?(\/|$))/i;
const SRC_FILE = /(^|\/)src\/.*\.(ts|tsx)$/;
const DESTRUCTIVE = [
  /rm\s+-rf\s+\/(\s|$)/,
  /rm\s+-rf\s+~(\s|$)/,
  /:\(\)\s*\{.*\};\s*:/,
  /mkfs\./,
  /dd\s+if=.*of=\/dev\//,
];

async function appendLog(directory, line) {
  try {
    const { appendFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    mkdirSync(join(directory, ".opencode"), { recursive: true });
    appendFileSync(
      join(directory, ".opencode", "hooks.log"),
      `[${new Date().toISOString()}] ${line}\n`,
    );
  } catch {
    /* logging best-effort only */
  }
}

export const SnapSortGuard = async ({ directory, $, client }) => {
  const log = async (level, message, extra) => {
    try {
      await client?.app?.log?.({
        body: { service: "snapsort-guard", level, message, extra },
      });
    } catch {
      /* ignore */
    }
  };

  return {
    "tool.execute.before": async (input, output) => {
      try {
        const args = output?.args ?? {};

        if (input.tool === "read") {
          const path = String(args.filePath ?? "");
          if (SENSITIVE.test(path)) {
            throw new Error(
              `[snapsort-guard] Lecture bloquée : ${path} (fichier sensible).`,
            );
          }
        }

        if (input.tool === "bash") {
          const command = String(args.command ?? "");
          for (const pattern of DESTRUCTIVE) {
            if (pattern.test(command)) {
              throw new Error(
                "[snapsort-guard] Commande destructive bloquée. Confirmez avec l'utilisateur.",
              );
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("snapsort-guard")) {
          throw error;
        }
        await log("error", "hook before a échoué", { message: String(error) });
      }
    },

    "tool.execute.after": async (input, output) => {
      try {
        if (input.tool !== "edit" && input.tool !== "write") return;
        const path = String(
          input.args?.filePath ?? output?.args?.filePath ?? "",
        );
        if (!SRC_FILE.test(path)) return;
        if (typeof $ !== "function") return;

        const result = await $`npx eslint ${path}`.quiet().nothrow();
        const exitCode = result?.exitCode ?? 0;
        const verdict = exitCode === 0 ? "OK" : "ERREURS";
        await appendLog(directory, `eslint ${verdict} — ${path}`);
        await log(exitCode === 0 ? "info" : "warn", `eslint ${verdict}`, { path });
      } catch (error) {
        await appendLog(directory, `eslint indisponible — ${String(error)}`);
      }
    },

    event: async ({ event }) => {
      try {
        if (event?.type === "session.idle") {
          await appendLog(
            directory,
            "session idle — rappel : npm run verify doit être vert avant de conclure",
          );
        }
      } catch {
        /* ignore */
      }
    },
  };
};
