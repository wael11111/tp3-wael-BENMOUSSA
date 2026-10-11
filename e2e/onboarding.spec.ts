import { expect, test } from "@playwright/test";

test("l'accueil guidé apparaît à la première visite et se ferme", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Passer" })).toBeVisible();
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByRole("button", { name: "Passer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Essayer la démo/i })).toBeVisible();
});
