import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

mkdirSync("screenshots", { recursive: true });

const verify = readFileSync("screenshots/preuves/verify.txt", "utf8")
  .split("\n")
  .slice(-34)
  .join("\n");
const agents = readFileSync("screenshots/preuves/agents.txt", "utf8");
const skills = readFileSync("screenshots/preuves/skills.txt", "utf8");

const esc = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const agentNames = [...agents.matchAll(/^([a-z][a-z0-9-]+) \((primary|subagent)\)/gm)]
  .map((match) => `${match[1]} (${match[2]})`)
  .join("\n");

const skillNames = [...skills.matchAll(/"name": "([^"]+)"/g)]
  .map((match) => match[1])
  .filter((name) => name !== "customize-opencode")
  .join("\n");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d1014; font-family: "SFMono-Regular", Menlo, Consolas, monospace; color: #d7e0ea; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 32px; }
  .pane { background: #141920; border: 1px solid #232c37; border-radius: 14px; overflow: hidden; }
  .bar { display: flex; gap: 7px; padding: 12px 14px; border-bottom: 1px solid #232c37; background: #11161d; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .title { margin-left: 10px; color: #8b98a6; font-size: 12px; }
  pre { margin: 0; padding: 18px; font-size: 12px; line-height: 1.55; white-space: pre-wrap; max-height: 560px; overflow: hidden; }
  .ok { color: #4fd18b; } .warn { color: #e2b04a; } .dim { color: #6b7887; } .acc { color: #ff8a5c; }
  h2 { font-family: Georgia, serif; color: #fff; font-size: 20px; margin: 0 0 4px; }
  .full { grid-column: 1 / -1; }
</style></head><body>
  <div class="grid">
    <div class="pane"><div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="title">SnapSort — harness OpenCode</span></div>
      <pre><span class="acc">$ opencode agent list</span>
${esc(agentNames)}

<span class="acc">$ opencode debug skill</span>
${esc(skillNames)}

<span class="dim">Plugins auto-chargés :</span>
<span class="ok">.opencode/plugins/snapsort-guard.js</span>
<span class="dim">Commands : /verify /test /lint /typecheck /build /audit /review /prepare-release /demo-check</span></pre></div>

    <div class="pane"><div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="title">npm run verify</span></div>
      <pre>${esc(verify)}</pre></div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 760 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: "screenshots/09-harness.png" });
await browser.close();
console.log("Capture du harness enregistrée : screenshots/09-harness.png");
