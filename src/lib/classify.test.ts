import { describe, expect, it } from "vitest";
import { classify, extractRecipe } from "@/lib/classify";

describe("classify", () => {
  it("reconnaît une recette à partir de son texte", () => {
    const result = classify({
      text: "Ingrédients\n250 g de farine\n125 g de beurre\nPréparation\nCuire au four 35 minutes à 180 degrés.",
      filename: "recette.png",
      width: 900,
      height: 1200,
    });
    expect(result.category).toBe("recipe");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("reconnaît un billet / réservation", () => {
    const result = classify({
      text: "Billet SNCF Paris Lyon. Référence PNR XK4P9Z. Voiture 12 Place 34. Embarquement.",
      filename: "billet.png",
      width: 900,
      height: 1200,
    });
    expect(result.category).toBe("ticket");
  });

  it("reconnaît un document administratif", () => {
    const result = classify({
      text: "FACTURE N° 2026-042. SIRET 812 345 678 00021. TVA 20 %. Paiement à 30 jours. IBAN.",
      filename: "facture.png",
      width: 900,
      height: 1200,
    });
    expect(result.category).toBe("document");
  });

  it("reconnaît un panier d'achat", () => {
    const result = classify({
      text: "Panier (3 articles). Sous-total 143,40 €. Livraison offerte. Ajouter au panier. Total.",
      filename: "panier.png",
      width: 900,
      height: 1200,
    });
    expect(result.category).toBe("shopping");
  });

  it("retombe sur « inconnu » pour un texte sans signal", () => {
    const result = classify({
      text: "azerty qwerty",
      filename: "x.png",
      width: 900,
      height: 1200,
    });
    expect(["unknown", "personal", "screenshot"]).toContain(result.category);
  });

  it("détecte une capture d'écran via le nom de fichier", () => {
    const result = classify({
      text: "9:41 Messages Réglages Notifications",
      filename: "Screenshot_2026-03-01.png",
      width: 1080,
      height: 2000,
    });
    expect(result.category).toBe("screenshot");
  });

  it("est insensible aux accents et à la casse", () => {
    const result = classify({
      text: "INGRÉDIENTS Préparation CUISSON",
      filename: "RECETTE.PNG",
      width: 900,
      height: 1200,
    });
    expect(result.category).toBe("recipe");
  });
});

describe("extractRecipe", () => {
  it("extrait le titre, les ingrédients et les étapes", () => {
    const recipe = extractRecipe(
      [
        "Tarte aux pommes",
        "Ingrédients",
        "- 4 pommes",
        "- 250 g de farine",
        "Préparation",
        "1. Mélanger",
        "2. Cuire 35 minutes",
      ].join("\n"),
    );
    expect(recipe).not.toBeNull();
    expect(recipe?.title).toBe("Tarte aux pommes");
    expect(recipe?.ingredients).toEqual(["4 pommes", "250 g de farine"]);
    expect(recipe?.steps).toEqual(["Mélanger", "Cuire 35 minutes"]);
  });

  it("retourne null sans section ingrédients", () => {
    expect(extractRecipe("Bonjour tout le monde")).toBeNull();
  });

  it("ne plante pas sur un texte vide", () => {
    expect(extractRecipe("")).toBeNull();
  });
});
