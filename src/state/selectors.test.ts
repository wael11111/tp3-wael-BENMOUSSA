import { describe, expect, it } from "vitest";
import type { Collection } from "@/types";
import { makePhoto } from "@/test/factory";
import {
  getDuplicateGroups,
  getQueue,
  getSessionProgress,
  getSimilarPairs,
  getStats,
  getSuggestions,
  getUndecided,
  searchPhotos,
} from "@/state/selectors";

const collections: Collection[] = [
  {
    id: "col_recettes",
    name: "Recettes",
    icon: "ChefHat",
    color: "#c2410c",
    builtin: true,
    description: "",
    createdAt: 1,
  },
];

describe("getUndecided / getQueue", () => {
  it("ne renvoie que les images non décidées, dans l'ordre d'import", () => {
    const photos = [
      makePhoto({ id: "a", importedAt: 3 }),
      makePhoto({ id: "b", importedAt: 1, decision: "keep" }),
      makePhoto({ id: "c", importedAt: 2 }),
    ];
    expect(getUndecided(photos).map((p) => p.id)).toEqual(["c", "a"]);
  });

  it("respecte les identifiants de la session", () => {
    const photos = [makePhoto({ id: "a" }), makePhoto({ id: "b" })];
    const queue = getQueue(photos, {
      id: "s1",
      startedAt: 0,
      photoIds: ["b"],
      size: 1,
    });
    expect(queue.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("getSessionProgress", () => {
  it("compte les décisions de la session", () => {
    const photos = [
      makePhoto({ id: "a", decision: "keep", decidedAt: 5 }),
      makePhoto({ id: "b", decision: null }),
    ];
    const progress = getSessionProgress(photos, {
      id: "s1",
      startedAt: 0,
      photoIds: ["a", "b"],
      size: 2,
    });
    expect(progress).toMatchObject({ done: 1, total: 2, remaining: 1, complete: false });
  });

  it("signale une session terminée", () => {
    const photos = [makePhoto({ id: "a", decision: "keep", decidedAt: 5 })];
    const progress = getSessionProgress(photos, {
      id: "s1",
      startedAt: 0,
      photoIds: ["a"],
      size: 1,
    });
    expect(progress.complete).toBe(true);
  });
});

describe("getDuplicateGroups", () => {
  it("regroupe les images par empreinte exacte", () => {
    const photos = [
      makePhoto({ id: "a", exactHash: "same" }),
      makePhoto({ id: "b", exactHash: "same" }),
      makePhoto({ id: "c", exactHash: "other" }),
    ];
    const groups = getDuplicateGroups(photos);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("getSimilarPairs", () => {
  it("détecte les empreintes perceptuelles proches", () => {
    const photos = [
      makePhoto({ id: "a", perceptualHash: "ffffffffffffffff", exactHash: "h1" }),
      makePhoto({ id: "b", perceptualHash: "fffffffffffffffe", exactHash: "h2" }),
      makePhoto({ id: "c", perceptualHash: "0000000000000000", exactHash: "h3" }),
    ];
    const pairs = getSimilarPairs(photos);
    expect(pairs).toHaveLength(1);
    expect([pairs[0]?.a.id, pairs[0]?.b.id].sort()).toEqual(["a", "b"]);
  });
});

describe("getStats", () => {
  it("agrège décisions, catégories et collections", () => {
    const now = Date.now();
    const photos = [
      makePhoto({ decision: "keep", decidedAt: now, category: "recipe", collectionId: null }),
      makePhoto({ decision: "trash", decidedAt: now, category: "document" }),
      makePhoto({ decision: "collection", decidedAt: now, collectionId: "col_recettes" }),
      makePhoto({ decision: null }),
    ];
    const stats = getStats(photos, []);
    expect(stats.total).toBe(4);
    expect(stats.decided).toBe(3);
    expect(stats.kept).toBe(1);
    expect(stats.trashed).toBe(1);
    expect(stats.collected).toBe(1);
    expect(stats.todayDecided).toBe(3);
    expect(stats.byCollection.col_recettes).toBe(1);
  });
});

describe("searchPhotos", () => {
  it("cherche dans le nom, le texte OCR et la catégorie", () => {
    const photos = [
      makePhoto({ id: "a", name: "tarte.png" }),
      makePhoto({ id: "b", ocrText: "Facture SIRET" }),
      makePhoto({ id: "c", category: "ticket" }),
    ];
    expect(searchPhotos(photos, collections, "tarte").map((p) => p.id)).toEqual(["a"]);
    expect(searchPhotos(photos, collections, "siret").map((p) => p.id)).toEqual(["b"]);
    expect(searchPhotos(photos, collections, "ticket").map((p) => p.id)).toEqual(["c"]);
  });

  it("est insensible aux accents", () => {
    const photos = [makePhoto({ id: "a", ocrText: "Ingrédients" })];
    expect(searchPhotos(photos, collections, "ingredients").map((p) => p.id)).toEqual(["a"]);
  });

  it("renvoie tout pour une requête vide", () => {
    const photos = [makePhoto({ id: "a" }), makePhoto({ id: "b" })];
    expect(searchPhotos(photos, collections, "  ")).toHaveLength(2);
  });
});

describe("getSuggestions", () => {
  it("propose la collection correspondant à la catégorie", () => {
    const photo = makePhoto({ id: "a", category: "recipe", categoryConfidence: 0.8 });
    const suggestions = getSuggestions(photo, [photo], collections);
    expect(suggestions.some((s) => s.kind === "collection" && s.collectionId === "col_recettes")).toBe(
      true,
    );
  });

  it("signale un doublon exact", () => {
    const a = makePhoto({ id: "a", exactHash: "dup" });
    const b = makePhoto({ id: "b", exactHash: "dup" });
    const suggestions = getSuggestions(a, [a, b], collections);
    expect(suggestions.some((s) => s.kind === "duplicate")).toBe(true);
  });
});
