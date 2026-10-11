import type { Category, RecipeData, Suggestion } from "@/types";
import { normalizeText } from "@/lib/utils";

export interface ClassifyInput {
  text: string;
  filename: string;
  width: number;
  height: number;
}

export interface Classification {
  category: Category;
  confidence: number;
  scores: Record<Category, number>;
  matched: string[];
}

const KEYWORDS: Record<Exclude<Category, "unknown" | "personal" | "screenshot">, string[]> = {
  recipe: [
    "ingredient", "ingredients", "recette", "preparation", "cuisson", "cuillere",
    "cuilleres", "c a soupe", "c a cafe", "farine", "beurre", "sucre", "oeuf",
    "oeufs", "huile", "gousse", "four", "prechauff", "degres", "minute", "mijoter",
    "sel", "poivre", "levure", "creme", "lait", "pate", "sauce", "epices",
    "pour 4 personnes", "pour 2 personnes", "servings", "recipe", "bake", "oven",
    "tablespoon", "teaspoon", "tbsp", "tsp", "mix", "stir", "bake for",
  ],
  ticket: [
    "billet", "ticket", "reservation", "boarding", "embarquement", "siege", "seat",
    "gate", "porte", "vol", "flight", "train", "gare", "departure", "depart",
    "arrivee", "sncf", "easyjet", "ryanair", "air france", "check-in", "e-ticket",
    "hotel", "confirmation", "qr code", "concert", "festival", "spectacle",
    "match", "place", "admission", "barcode", "pnr", "itineraire", "aller",
    "retour", "quai", "voie", "classe", "wagon", "bagage",
  ],
  document: [
    "facture", "invoice", "contrat", "attestation", "ordonnance", "certificat",
    "diplome", "recu", "iban", "tva", "siret", "impots", "amende", "quittance",
    "conditions generales", "mentions legales", "sommaire", "paragraphe",
    "signature", "cachet", "notaire", "assurance", "police", "mutuelle",
    "bulletin", "salaire", "rib", "bic", "numero de compte",
  ],
  shopping: [
    "panier", "ajouter au panier", "prix", "promo", "solde", "livraison",
    "commande", "amazon", "en stock", "reduction", "remise", "total", "euros",
    "taille", "pointure", "coloris", "checkout", "paiement", "expedition",
    "panier total", "sous-total", "frais de port",
  ],
  inspiration: [
    "citation", "quote", "inspiration", "pensee", "disait", "proverbe",
    "sagesse", "philosophie", "rever", "creer", "imagination", "motto",
    "mantra", "believe", "dream", "inspire",
  ],
};

const UI_KEYWORDS = [
  "parametres", "reglages", "notifications", "wi-fi", "wifi", "batterie",
  "capture d ecran", "capture decran", "screenshot", "menu", "rechercher",
  "messages", "appareil photo", "galerie", "partager", "en ligne", "il y a",
];

function countMatches(haystack: string, needles: string[]): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  for (const needle of needles) {
    if (haystack.includes(needle)) {
      score += 1;
      matched.push(needle);
    }
  }
  return { score, matched };
}

function emptyScores(): Record<Category, number> {
  return {
    recipe: 0,
    ticket: 0,
    document: 0,
    screenshot: 0,
    inspiration: 0,
    shopping: 0,
    personal: 0,
    unknown: 0,
  };
}

export function classify(input: ClassifyInput): Classification {
  const text = normalizeText(input.text ?? "");
  const filename = normalizeText(input.filename ?? "");
  const haystack = `${filename}\n${text}`;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const scores = emptyScores();
  const matched: string[] = [];

  for (const [category, keywords] of Object.entries(KEYWORDS) as [
    Exclude<Category, "unknown" | "personal" | "screenshot">,
    string[],
  ][]) {
    const result = countMatches(haystack, keywords);
    scores[category] = result.score;
    matched.push(...result.matched.map((m) => `${category}:${m}`));
  }

  // Screenshot: filename clue, phone-ish aspect ratio, or UI vocabulary.
  let screenshotScore = countMatches(text, UI_KEYWORDS).score * 0.8;
  if (/screenshot|capture|screen|img_\d|photo.*ecran/.test(filename)) {
    screenshotScore += 2;
  }
  const aspect = input.height > 0 ? input.width / input.height : 1;
  if (aspect < 0.7 && wordCount > 4) screenshotScore += 0.8;
  scores.screenshot = screenshotScore;

  // Personal: photographic ratio with little or no readable text.
  const textDensity = wordCount / Math.max(1, input.width * input.height) * 1_000_000;
  if (wordCount < 6 && textDensity < 1.2) {
    scores.personal = 1.2;
  }
  if (aspect > 0.75 && aspect < 1.4 && wordCount < 4) {
    scores.personal += 0.6;
  }

  let best: Category = "unknown";
  let bestScore = 0;
  let secondScore = 0;
  for (const [category, score] of Object.entries(scores) as [Category, number][]) {
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = category;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (bestScore < 1) {
    return {
      category: "unknown",
      confidence: 0.2,
      scores,
      matched,
    };
  }

  const margin = bestScore - secondScore;
  const confidence = Math.max(
    0.25,
    Math.min(0.95, 0.4 + margin * 0.15 + Math.min(bestScore, 6) * 0.06),
  );

  return { category: best, confidence: Number(confidence.toFixed(2)), scores, matched };
}

const INGREDIENT_HEADINGS = /^(ingredients?|ingredients pour|pour \d|liste des ingredients)/i;
const STEP_HEADINGS = /^(preparation|instructions?|etapes?|methode|realisation|directions?)/i;
const BULLET = /^[-•*·–]\s*/;

export function extractRecipe(text: string): RecipeData | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const ingredientIndex = lines.findIndex((line) => INGREDIENT_HEADINGS.test(normalizeText(line)));
  if (ingredientIndex === -1) return null;

  const stepIndex = lines.findIndex(
    (line, index) => index > ingredientIndex && STEP_HEADINGS.test(normalizeText(line)),
  );

  const title =
    lines
      .slice(0, ingredientIndex)
      .find((line) => line.length > 3 && line.length < 80 && !BULLET.test(line)) ??
    "Recette";

  const ingredientLines = lines.slice(
    ingredientIndex + 1,
    stepIndex === -1 ? lines.length : stepIndex,
  );
  const ingredients = ingredientLines
    .map((line) => line.replace(BULLET, "").trim())
    .filter((line) => line.length > 1 && line.length < 80)
    .slice(0, 25);

  const steps =
    stepIndex === -1
      ? []
      : lines
          .slice(stepIndex + 1)
          .map((line) => line.replace(/^\d+[.)]\s*/, "").replace(BULLET, "").trim())
          .filter((line) => line.length > 3)
          .slice(0, 30);

  if (ingredients.length === 0) return null;
  return { title, ingredients, steps };
}

export function buildSuggestions(
  photo: {
    id: string;
    category: Category;
    categoryConfidence: number;
    ocrText: string;
    name: string;
    width: number;
    height: number;
    exactHash: string;
    perceptualHash: string;
  },
  context: {
    duplicateOf: { id: string; name: string } | null;
    similarTo: { id: string; name: string; distance: number }[];
    collections: { id: string; name: string }[];
  },
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (context.duplicateOf) {
    suggestions.push({
      kind: "duplicate",
      label: "Doublon exact détecté",
      detail: `Contenu identique à « ${context.duplicateOf.name} »`,
      collectionId: null,
      confidence: 1,
    });
  }

  if (context.similarTo.length > 0) {
    const first = context.similarTo[0];
    if (first) {
      suggestions.push({
        kind: "similar",
        label: "Image visuellement proche",
        detail: `Ressemble à « ${first.name} » (distance ${first.distance}/64)`,
        collectionId: null,
        confidence: 0.6,
      });
    }
  }

  const categoryToCollection: Partial<Record<Category, string>> = {
    recipe: "Recettes",
    ticket: "Voyages & événements",
    document: "Documents importants",
    shopping: "Shopping",
    inspiration: "Inspirations",
    screenshot: "À revoir",
  };

  if (photo.category !== "unknown") {
    const targetName = categoryToCollection[photo.category];
    const target = targetName
      ? context.collections.find((collection) => collection.name === targetName)
      : undefined;
    if (target) {
      suggestions.push({
        kind: "collection",
        label: `Classer dans « ${target.name} »`,
        detail: `Catégorie détectée : ${photo.category} (confiance ${Math.round(photo.categoryConfidence * 100)} %)`,
        collectionId: target.id,
        confidence: photo.categoryConfidence,
      });
    }
  }

  if (photo.category === "recipe") {
    const recipe = extractRecipe(photo.ocrText);
    if (recipe) {
      suggestions.push({
        kind: "recipe",
        label: `Créer une fiche recette : ${recipe.title}`,
        detail: `${recipe.ingredients.length} ingrédient(s) détecté(s)`,
        collectionId: null,
        confidence: 0.7,
      });
    }
  }

  return suggestions;
}
