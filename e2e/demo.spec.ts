import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("snapsort.onboarded", "1");
    } catch {
      /* storage indisponible : on continue sans */
    }
  });
});

async function loadDemo(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Essayer la démo/i }).click();
  await expect(page.getByText("Session de tri")).toBeVisible({ timeout: 20_000 });
}

test.describe("SnapSort — parcours principal", () => {
  test("l'accueil présente le produit et les deux portes d'entrée", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vos images");
    await expect(page.getByRole("button", { name: /Essayer la démo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Importer mes images/i })).toBeVisible();
  });

  test("la démo se charge, se trie et persiste après rechargement", async ({ page }) => {
    await page.goto("/");
    await loadDemo(page);

    const progress = page.getByRole("progressbar", { name: "Progression de la session" });
    await expect(progress).toHaveAttribute("aria-valuenow", "0");

    await page.getByRole("button", { name: "Conserver" }).click();
    await expect(progress).toHaveAttribute("aria-valuenow", "1");

    await page.reload();
    await expect(page.getByText("Session de tri")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("progressbar", { name: "Progression de la session" }),
    ).toHaveAttribute("aria-valuenow", "1");
  });

  test("le tri au clavier fonctionne et s'annule", async ({ page }) => {
    await page.goto("/");
    await loadDemo(page);

    const progress = page.getByRole("progressbar", { name: "Progression de la session" });
    await page.keyboard.press("ArrowRight");
    await expect(progress).toHaveAttribute("aria-valuenow", "1");

    await page.getByRole("button", { name: /Annuler la dernière décision/i }).click();
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
  });

  test("un fichier invalide est rejeté avec une raison lisible", async ({ page }) => {
    await page.goto("/#/import");
    await page.getByLabel("Sélectionner des images").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("pas une image"),
    });
    await expect(page.getByText(/Format non pris en charge/i)).toBeVisible();
  });

  test("les collections se remplissent après classement", async ({ page }) => {
    await page.goto("/");
    await loadDemo(page);

    await page.getByRole("button", { name: "Classer" }).first().click();
    await page.getByRole("button", { name: "Recettes" }).click();

    await page.goto("/#/collections");
    await expect(page.getByRole("heading", { name: "Recettes" })).toBeVisible();
  });
});
