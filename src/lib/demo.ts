import type { Category } from "@/types";

export interface DemoSpec {
  key: string;
  name: string;
  category: Category;
  ocrText: string;
  note: string;
  /** Draws the sample at the given size. Deterministic, offline, no assets. */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

const CREAM = "#f7f2e8";
const INK = "#211d18";

function base(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background = CREAM,
): void {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  options: {
    size?: number;
    weight?: string;
    font?: string;
    color?: string;
    align?: CanvasTextAlign;
    maxWidth?: number;
  } = {},
): void {
  ctx.fillStyle = options.color ?? INK;
  ctx.font = `${options.weight ?? "400"} ${options.size ?? 28}px ${options.font ?? "Georgia, serif"}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y, options.maxWidth);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: Parameters<typeof text>[4] = {},
): number {
  const words = value.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      text(ctx, line, x, cursorY, options);
      line = word;
      cursorY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) {
    text(ctx, line, x, cursorY, options);
    cursorY += lineHeight;
  }
  return cursorY;
}

export const DEMO_SPECS: DemoSpec[] = [
  {
    key: "recipe",
    name: "recette-tarte-aux-pommes.png",
    category: "recipe",
    note: "Exemple de démonstration : recette détectée par OCR.",
    ocrText: [
      "Tarte aux pommes rustique",
      "",
      "Ingrédients",
      "- 4 pommes",
      "- 250 g de farine",
      "- 125 g de beurre",
      "- 80 g de sucre",
      "- 1 oeuf",
      "- 1 pincée de sel",
      "",
      "Préparation",
      "1. Mélanger la farine, le beurre et le sel.",
      "2. Ajouter l'oeuf et former une pâte.",
      "3. Étaler, garnir de pommes et saupoudrer de sucre.",
      "4. Cuire 35 minutes au four à 180 degrés.",
    ].join("\n"),
    draw(ctx, width, height) {
      base(ctx, width, height);
      ctx.fillStyle = "#e8ddc7";
      ctx.fillRect(0, 0, width, 12);
      text(ctx, "CARNET DE CUISINE", 64, 96, {
        size: 22,
        weight: "700",
        font: "Helvetica, Arial, sans-serif",
        color: "#a1652f",
      });
      text(ctx, "Tarte aux", 64, 190, { size: 68, weight: "700" });
      text(ctx, "pommes rustique", 64, 262, { size: 68, weight: "700" });
      ctx.strokeStyle = "#a1652f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(64, 300);
      ctx.lineTo(width - 64, 300);
      ctx.stroke();
      text(ctx, "Ingrédients", 64, 366, {
        size: 34,
        weight: "700",
        font: "Helvetica, Arial, sans-serif",
      });
      const ingredients = [
        "4 pommes",
        "250 g de farine",
        "125 g de beurre",
        "80 g de sucre",
        "1 oeuf",
        "1 pincée de sel",
      ];
      ingredients.forEach((line, index) => {
        text(ctx, "—", 64, 418 + index * 44, { size: 28, color: "#a1652f" });
        text(ctx, line, 110, 418 + index * 44, { size: 30 });
      });
      text(ctx, "Préparation", 64, 730, {
        size: 34,
        weight: "700",
        font: "Helvetica, Arial, sans-serif",
      });
      wrap(
        ctx,
        "Mélanger la farine, le beurre et le sel. Ajouter l'oeuf, former une pâte, étaler et garnir de pommes. Cuire 35 minutes au four à 180 degrés.",
        64,
        786,
        width - 128,
        42,
        { size: 27, color: "#3b352c" },
      );
    },
  },
  {
    key: "ticket",
    name: "billet-train-paris-lyon.png",
    category: "ticket",
    note: "Exemple de démonstration : billet de train avec QR et référence.",
    ocrText: [
      "SNCF VOYAGEURS",
      "Billet électronique",
      "Paris Gare de Lyon — Lyon Part-Dieu",
      "Départ 14:32   Arrivée 16:28",
      "Voiture 12   Place 34",
      "Référence PNR : XK4P9Z",
      "Tarif Seconde classe",
    ].join("\n"),
    draw(ctx, width, height) {
      base(ctx, width, height, "#1c2430");
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(40, 60, width - 80, height - 120);
      text(ctx, "SNCF", 90, 150, {
        size: 40,
        weight: "800",
        font: "Helvetica, Arial, sans-serif",
        color: "#1c2430",
      });
      text(ctx, "BILLET ÉLECTRONIQUE", width - 90, 150, {
        size: 22,
        weight: "700",
        font: "Helvetica, Arial, sans-serif",
        color: "#8a7a5c",
        align: "right",
      });
      text(ctx, "Paris", 90, 300, { size: 64, weight: "700", color: "#1c2430" });
      text(ctx, "Gare de Lyon", 90, 350, { size: 26, color: "#5b5348" });
      ctx.strokeStyle = "#1c2430";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(90, 390);
      ctx.lineTo(width - 90, 390);
      ctx.stroke();
      text(ctx, "Lyon", 90, 500, { size: 64, weight: "700", color: "#1c2430" });
      text(ctx, "Part-Dieu", 90, 550, { size: 26, color: "#5b5348" });
      text(ctx, "Départ 14:32", 90, 680, { size: 30, weight: "700", color: "#1c2430" });
      text(ctx, "Arrivée 16:28", 90, 726, { size: 30, color: "#5b5348" });
      text(ctx, "Voiture 12  ·  Place 34", 90, 800, {
        size: 28,
        weight: "700",
        color: "#1c2430",
      });
      text(ctx, "Référence PNR : XK4P9Z", 90, 850, { size: 24, color: "#5b5348" });
      ctx.fillStyle = "#1c2430";
      for (let row = 0; row < 6; row += 1) {
        for (let col = 0; col < 6; col += 1) {
          if ((row * 6 + col) % 3 !== 0) {
            ctx.fillRect(width - 210 + col * 20, 300 + row * 20, 16, 16);
          }
        }
      }
    },
  },
  {
    key: "document",
    name: "facture-mars-2026.png",
    category: "document",
    note: "Exemple de démonstration : facture avec montants et numéro.",
    ocrText: [
      "FACTURE N° 2026-042",
      "Atelier Dupont SAS",
      "Date d'émission : 12 mars 2026",
      "Prestation de conseil      1 200,00 €",
      "TVA 20 %                    240,00 €",
      "Total TTC                  1 440,00 €",
      "SIRET 812 345 678 00021",
      "Paiement à 30 jours",
    ].join("\n"),
    draw(ctx, width, height) {
      base(ctx, width, height, "#ffffff");
      text(ctx, "ATELIER DUPONT", 72, 110, {
        size: 26,
        weight: "800",
        font: "Helvetica, Arial, sans-serif",
        color: "#1f3a5f",
      });
      text(ctx, "FACTURE", 72, 220, { size: 58, weight: "700", color: "#1f3a5f" });
      text(ctx, "N° 2026-042", 72, 268, { size: 28, color: "#5b6b7f" });
      ctx.strokeStyle = "#d7dee7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(72, 320);
      ctx.lineTo(width - 72, 320);
      ctx.stroke();
      const rows = [
        ["Prestation de conseil", "1 200,00 €"],
        ["TVA 20 %", "240,00 €"],
      ];
      rows.forEach((row, index) => {
        text(ctx, row[0] ?? "", 72, 390 + index * 56, { size: 28 });
        text(ctx, row[1] ?? "", width - 72, 390 + index * 56, {
          size: 28,
          align: "right",
        });
      });
      ctx.fillStyle = "#1f3a5f";
      ctx.fillRect(72, 510, width - 144, 80);
      text(ctx, "Total TTC", 100, 562, { size: 30, weight: "700", color: "#ffffff" });
      text(ctx, "1 440,00 €", width - 100, 562, {
        size: 30,
        weight: "700",
        color: "#ffffff",
        align: "right",
      });
      text(ctx, "SIRET 812 345 678 00021", 72, 690, { size: 24, color: "#5b6b7f" });
      text(ctx, "Paiement à 30 jours", 72, 730, { size: 24, color: "#5b6b7f" });
    },
  },
  {
    key: "screenshot",
    name: "capture-messages.png",
    category: "screenshot",
    note: "Exemple de démonstration : capture d'écran d'une conversation.",
    ocrText: [
      "9:41",
      "Messages",
      "Camille  il y a 2 min",
      "On se retrouve à 18h devant la gare ?",
      "Toi  Maintenant",
      "Parfait, à tout à l'heure !",
      "Réglages   Notifications",
    ].join("\n"),
    draw(ctx, width, height) {
      base(ctx, width, height, "#101418");
      ctx.fillStyle = "#1b2129";
      ctx.fillRect(30, 30, width - 60, height - 60);
      text(ctx, "9:41", width / 2, 84, {
        size: 24,
        weight: "700",
        font: "Helvetica, Arial, sans-serif",
        color: "#e7edf3",
        align: "center",
      });
      text(ctx, "Messages", 60, 170, {
        size: 38,
        weight: "800",
        font: "Helvetica, Arial, sans-serif",
        color: "#ffffff",
      });
      ctx.fillStyle = "#2b333d";
      ctx.fillRect(60, 230, width - 120, 2);
      const bubbles = [
        { mine: false, text: "On se retrouve à 18h devant la gare ?" },
        { mine: true, text: "Parfait, à tout à l'heure !" },
      ];
      bubbles.forEach((bubble, index) => {
        const bubbleWidth = width - 200;
        const x = bubble.mine ? width - 90 - bubbleWidth : 90;
        ctx.fillStyle = bubble.mine ? "#2f6bff" : "#2b333d";
        ctx.fillRect(x, 320 + index * 170, bubbleWidth, 120);
        text(ctx, bubble.text, x + 24, 360 + index * 170, {
          size: 26,
          font: "Helvetica, Arial, sans-serif",
          color: "#ffffff",
          maxWidth: bubbleWidth - 48,
        });
      });
      text(ctx, "Réglages  ·  Notifications", 90, 780, {
        size: 24,
        font: "Helvetica, Arial, sans-serif",
        color: "#8b98a6",
      });
    },
  },
  {
    key: "inspiration",
    name: "citation-atelier.png",
    category: "inspiration",
    note: "Exemple de démonstration : citation à conserver.",
    ocrText: [
      "« La simplicité est la sophistication suprême. »",
      "Léonard de Vinci",
      "Citation à garder pour l'atelier.",
    ].join("\n"),
    draw(ctx, width, height) {
      base(ctx, width, height, "#171310");
      ctx.fillStyle = "#e0a458";
      ctx.font = "700 200px Georgia, serif";
      ctx.fillText("“", 70, 340);
      wrap(
        ctx,
        "La simplicité est la sophistication suprême.",
        110,
        460,
        width - 220,
        72,
        { size: 56, weight: "700", color: "#f4efe4" },
      );
      text(ctx, "— Léonard de Vinci", 110, 720, {
        size: 30,
        color: "#e0a458",
      });
    },
  },
  {
    key: "shopping",
    name: "panier-mobilier.png",
    category: "shopping",
    note: "Exemple de démonstration : panier d'achat.",
    ocrText: [
      "Panier (3 articles)",
      "Étagère chêne massif      89,00 €",
      "Lampe de bureau           34,90 €",
      "Coussin lin               19,50 €",
      "Sous-total               143,40 €",
      "Livraison offerte",
      "Total                    143,40 €",
    ].join("\n"),
    draw(ctx, width, height) {
      base(ctx, width, height, "#f2f5ef");
      text(ctx, "Panier (3 articles)", 70, 140, {
        size: 42,
        weight: "800",
        font: "Helvetica, Arial, sans-serif",
        color: "#1f3d2b",
      });
      const rows = [
        ["Étagère chêne massif", "89,00 €"],
        ["Lampe de bureau", "34,90 €"],
        ["Coussin lin", "19,50 €"],
      ];
      rows.forEach((row, index) => {
        ctx.fillStyle = "#e2e8dc";
        ctx.fillRect(70, 200 + index * 130, width - 140, 104);
        text(ctx, row[0] ?? "", 100, 260 + index * 130, { size: 30, color: "#1f3d2b" });
        text(ctx, row[1] ?? "", width - 100, 260 + index * 130, {
          size: 30,
          weight: "700",
          color: "#1f3d2b",
          align: "right",
        });
      });
      ctx.fillStyle = "#1f3d2b";
      ctx.fillRect(70, 610, width - 140, 90);
      text(ctx, "Total", 100, 668, { size: 32, weight: "700", color: "#f2f5ef" });
      text(ctx, "143,40 €", width - 100, 668, {
        size: 32,
        weight: "700",
        color: "#f2f5ef",
        align: "right",
      });
      text(ctx, "Livraison offerte", 70, 750, { size: 26, color: "#4a6b52" });
    },
  },
];

/** A slightly altered duplicate of the recipe, to demonstrate perceptual similarity. */
export const SIMILAR_RECIPE_SPEC: DemoSpec = {
  key: "recipe-copy",
  name: "recette-tarte-aux-pommes-copie.png",
  category: "recipe",
  note: "Exemple de démonstration : quasi-doublon (image similaire, contenu différent).",
  ocrText: DEMO_SPECS[0]?.ocrText ?? "",
  draw(ctx, width, height) {
    base(ctx, width, height);
    ctx.save();
    ctx.translate(14, 10);
    ctx.scale(0.97, 0.97);
    ctx.fillStyle = "#e8ddc7";
    ctx.fillRect(0, 0, width, 12);
    text(ctx, "CARNET DE CUISINE", 64, 96, {
      size: 22,
      weight: "700",
      font: "Helvetica, Arial, sans-serif",
      color: "#a1652f",
    });
    text(ctx, "Tarte aux", 64, 190, { size: 68, weight: "700" });
    text(ctx, "pommes rustique", 64, 262, { size: 68, weight: "700" });
    text(ctx, "Ingrédients", 64, 366, {
      size: 34,
      weight: "700",
      font: "Helvetica, Arial, sans-serif",
    });
    ["4 pommes", "250 g de farine", "125 g de beurre", "80 g de sucre"].forEach(
      (line, index) => {
        text(ctx, "—", 64, 418 + index * 44, { size: 28, color: "#a1652f" });
        text(ctx, line, 110, 418 + index * 44, { size: 30 });
      },
    );
    ctx.restore();
  },
};

export interface GeneratedDemo {
  spec: DemoSpec;
  blob: Blob;
  duplicateOf: string | null;
  similarTo: string | null;
}

function drawToBlob(spec: DemoSpec, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas indisponible"));
  spec.draw(ctx, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Rendu de l'image de démonstration impossible"));
    }, "image/png");
  });
}

/**
 * Builds the demo set entirely in the browser. The two recipe copies are drawn
 * from the same routine for the exact duplicate, and from a shifted variant for
 * the perceptual one.
 */
export async function generateDemoImages(): Promise<GeneratedDemo[]> {
  const results: GeneratedDemo[] = [];
  for (const spec of DEMO_SPECS) {
    const blob = await drawToBlob(spec, 900, 1200);
    results.push({
      spec,
      blob,
      duplicateOf: null,
      similarTo: null,
    });
  }

  // Exact duplicate: identical bytes, different file name.
  const recipe = DEMO_SPECS[0];
  if (recipe) {
    const duplicateBlob = await drawToBlob(recipe, 900, 1200);
    results.push({
      spec: {
        ...recipe,
        key: "recipe-duplicate",
        name: "recette-tarte-aux-pommes (1).png",
        note: "Exemple de démonstration : doublon exact du fichier recette.",
      },
      blob: duplicateBlob,
      duplicateOf: recipe.name,
      similarTo: null,
    });
  }

  const similarBlob = await drawToBlob(SIMILAR_RECIPE_SPEC, 900, 1200);
  results.push({
    spec: SIMILAR_RECIPE_SPEC,
    blob: similarBlob,
    duplicateOf: null,
    similarTo: recipe?.name ?? null,
  });

  return results;
}
