import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = "screenshots";

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      /* not ready yet */
    }
    await sleep(400);
  }
  throw new Error(`Serveur indisponible : ${url}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = spawn(
    "npm",
    ["run", "preview", "--", "--port", String(PORT), "--strictPort"],
    { stdio: "ignore" },
  );

  try {
    await waitForServer(BASE);
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("snapsort.onboarded", "1"));

    await page.goto(`${BASE}/`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/01-accueil.png`, fullPage: false });

    await page.goto(`${BASE}/#/import`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/02-import.png` });

    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: /Essayer la démo/i }).click();
    await page.getByText("Session de tri").waitFor({ timeout: 20_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/03-tri-session.png` });

    await page.getByRole("button", { name: "Conserver" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/04-tri-analyse.png` });

    await page.goto(`${BASE}/#/collections`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/05-collections.png` });

    await page.goto(`${BASE}/#/stats`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/06-progression.png` });

    await page.goto(`${BASE}/#/settings`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/07-parametres.png` });

    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.addInitScript(() => localStorage.setItem("snapsort.onboarded", "1"));
    await mobile.goto(`${BASE}/#/sort`);
    await mobile.waitForTimeout(1400);
    await mobile.screenshot({ path: `${OUT}/08-tri-mobile.png` });

    await browser.close();
    console.log("Captures enregistrées dans screenshots/");
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
