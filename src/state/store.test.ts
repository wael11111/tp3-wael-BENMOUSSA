import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/image")>();
  return {
    ...actual,
    readImageDimensions: vi.fn(async () => ({ width: 800, height: 600 })),
    downscaleBlob: vi.fn(async (blob: Blob) => blob),
  };
});

vi.mock("@/lib/hashing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hashing")>();
  return {
    ...actual,
    perceptualHash: vi.fn(async () => "0000000000000000"),
  };
});

vi.mock("@/lib/demo", () => ({
  generateDemoImages: vi.fn(async () => [
    {
      spec: {
        key: "recipe",
        name: "demo-recette.png",
        category: "recipe",
        ocrText: "Ingrédients\n250 g de farine",
        note: "Exemple de démonstration.",
        draw: () => undefined,
      },
      blob: new Blob(["demo-recipe"], { type: "image/png" }),
      duplicateOf: null,
      similarTo: null,
    },
    {
      spec: {
        key: "ticket",
        name: "demo-billet.png",
        category: "ticket",
        ocrText: "Billet SNCF Paris Lyon",
        note: "Exemple de démonstration.",
        draw: () => undefined,
      },
      blob: new Blob(["demo-ticket"], { type: "image/png" }),
      duplicateOf: null,
      similarTo: null,
    },
  ]),
}));

import { AppStore } from "@/state/store";
import { clearAll, getBlob, getAllPhotos, resetDbConnection } from "@/db/database";

function pngFile(name: string, content = "image-bytes"): File {
  return new File([content], name, { type: "image/png" });
}

async function freshStore(): Promise<AppStore> {
  const store = new AppStore();
  await store.init();
  return store;
}

beforeEach(async () => {
  resetDbConnection();
  await clearAll();
});

describe("initialisation", () => {
  it("crée les collections intégrées et se marque prêt", async () => {
    const store = await freshStore();
    const state = store.getSnapshot();
    expect(state.ready).toBe(true);
    expect(state.collections.length).toBeGreaterThanOrEqual(7);
    expect(state.collections.map((c) => c.name)).toContain("Recettes");
  });
});

describe("import", () => {
  it("importe des fichiers valides et les persiste", async () => {
    const store = await freshStore();
    const report = await store.importFiles([pngFile("a.png"), pngFile("b.png", "other")]);
    expect(report.added).toBe(2);
    expect(report.rejected).toHaveLength(0);
    expect(store.getSnapshot().photos).toHaveLength(2);

    const reloaded = await freshStore();
    expect(reloaded.getSnapshot().photos).toHaveLength(2);
  });

  it("détecte les doublons exacts sans dupliquer le blob", async () => {
    const store = await freshStore();
    const report = await store.importFiles([pngFile("a.png"), pngFile("copie.png")]);
    expect(report.added).toBe(2);
    expect(report.duplicates).toBe(1);
    const [first, second] = store.getSnapshot().photos;
    expect(first?.blobKey).toBe(second?.blobKey);
    expect(first?.exactHash).toBe(second?.exactHash);
  });

  it("rejette les fichiers invalides avec une raison lisible", async () => {
    const store = await freshStore();
    const bad = new File(["hello"], "notes.txt", { type: "text/plain" });
    const report = await store.importFiles([bad]);
    expect(report.added).toBe(0);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]?.reason).toMatch(/Format non pris en charge/);
  });

  it("rejette un fichier vide", async () => {
    const store = await freshStore();
    const empty = new File([], "vide.png", { type: "image/png" });
    const report = await store.importFiles([empty]);
    expect(report.rejected[0]?.reason).toMatch(/vide/i);
  });

  it("signale la progression de l'import", async () => {
    const store = await freshStore();
    const onProgress = vi.fn();
    await store.importFiles([pngFile("a.png")], onProgress);
    expect(onProgress).toHaveBeenCalled();
  });
});

describe("décisions et annulation", () => {
  it("enregistre une décision et la restitue après rechargement", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const photo = store.getSnapshot().photos[0];
    expect(photo).toBeDefined();
    await store.decide(photo!.id, "keep");

    const reloaded = await freshStore();
    expect(reloaded.getSnapshot().photos[0]?.decision).toBe("keep");
  });

  it("annule la dernière décision", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const photo = store.getSnapshot().photos[0]!;
    await store.decide(photo.id, "trash");
    expect(store.getSnapshot().photos[0]?.decision).toBe("trash");
    const undone = await store.undo();
    expect(undone).toBe(true);
    expect(store.getSnapshot().photos[0]?.decision).toBeNull();
  });

  it("ne fait rien si l'historique est vide", async () => {
    const store = await freshStore();
    expect(await store.undo()).toBe(false);
    expect(store.canUndo()).toBe(false);
  });

  it("classe dans une collection", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const photo = store.getSnapshot().photos[0]!;
    const recipes = store.getSnapshot().collections.find((c) => c.name === "Recettes")!;
    await store.decide(photo.id, "collection", recipes.id);
    const updated = store.getSnapshot().photos[0]!;
    expect(updated.decision).toBe("collection");
    expect(updated.collectionId).toBe(recipes.id);
  });
});

describe("sessions", () => {
  it("démarre une session avec la taille demandée", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png"), pngFile("b.png", "b"), pngFile("c.png", "c")]);
    await store.startSession(2);
    expect(store.getSnapshot().session?.photoIds).toHaveLength(2);
    expect(store.getSnapshot().session?.size).toBe(2);
  });

  it("progresse quand les images de la session sont décidées", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png"), pngFile("b.png", "b")]);
    await store.startSession(2);
    const ids = store.getSnapshot().session!.photoIds;
    await store.decide(ids[0]!, "keep");
    await store.decide(ids[1]!, "later");
    const session = store.getSnapshot().session!;
    const decided = store
      .getSnapshot()
      .photos.filter((p) => session.photoIds.includes(p.id) && p.decision !== null);
    expect(decided).toHaveLength(2);
  });
});

describe("collections", () => {
  it("crée, renomme et supprime une collection", async () => {
    const store = await freshStore();
    const collection = await store.createCollection("Croquis");
    expect(collection).not.toBeNull();
    await store.renameCollection(collection!.id, "Dessins");
    expect(store.getSnapshot().collections.find((c) => c.id === collection!.id)?.name).toBe(
      "Dessins",
    );
    await store.deleteCollection(collection!.id);
    expect(store.getSnapshot().collections.find((c) => c.id === collection!.id)).toBeUndefined();
  });

  it("déclasse les images quand la collection est supprimée", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const photo = store.getSnapshot().photos[0]!;
    const collection = await store.createCollection("Temp");
    await store.assignCollection(photo.id, collection!.id);
    await store.deleteCollection(collection!.id);
    expect(store.getSnapshot().photos[0]?.collectionId).toBeNull();
  });

  it("retire une image d'une collection sans la supprimer", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const photo = store.getSnapshot().photos[0]!;
    const recipes = store.getSnapshot().collections[0]!;
    await store.assignCollection(photo.id, recipes.id);
    await store.removeFromCollection(photo.id);
    expect(store.getSnapshot().photos).toHaveLength(1);
    expect(store.getSnapshot().photos[0]?.collectionId).toBeNull();
  });
});

describe("robustesse", () => {
  it("assainit des données corrompues au chargement", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const { getDb } = await import("@/db/database");
    const db = await getDb();
    await db.put("photos", {
      id: "broken",
      name: 42,
      decision: "invalid",
      importedAt: "hier",
    } as never);

    const reloaded = await freshStore();
    const broken = reloaded.getSnapshot().photos.find((p) => p.id === "broken");
    expect(broken).toBeDefined();
    expect(broken?.name).toBe("sans-nom");
    expect(broken?.decision).toBeNull();
    expect(typeof broken?.importedAt).toBe("number");
  });

  it("supprime le blob seulement s'il n'est plus référencé", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png"), pngFile("copie.png")]);
    const [first, second] = store.getSnapshot().photos;
    await store.removePhoto(first!.id);
    expect(await getBlob(second!.blobKey)).toBeDefined();
    await store.removePhoto(second!.id);
    expect(await getBlob(second!.blobKey)).toBeUndefined();
  });

  it("vide la corbeille", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png"), pngFile("b.png", "b")]);
    for (const photo of store.getSnapshot().photos) {
      await store.decide(photo.id, "trash");
    }
    await store.emptyTrash();
    expect(store.getSnapshot().photos).toHaveLength(0);
  });

  it("marque l'OCR en erreur quand il est indisponible", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const photo = store.getSnapshot().photos[0]!;
    await store.analyzePhoto(photo.id);
    const updated = store.getSnapshot().photos[0]!;
    expect(updated.ocrStatus).toBe("error");
    expect(updated.ocrError).toBeTruthy();
  });

  it("réinitialise la démo sans toucher aux imports", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    await store.importDemo();
    expect(store.getSnapshot().photos.some((p) => p.source === "demo")).toBe(true);
    await store.resetDemo();
    expect(store.getSnapshot().photos.some((p) => p.source === "demo")).toBe(false);
    expect(store.getSnapshot().photos).toHaveLength(1);
  });

  it("exporte des données structurées valides", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    const json = await store.exportData();
    const parsed = JSON.parse(json) as { app: string; photos: unknown[] };
    expect(parsed.app).toBe("SnapSort");
    expect(parsed.photos).toHaveLength(1);
  });

  it("efface tout lors d'une réinitialisation", async () => {
    const store = await freshStore();
    await store.importFiles([pngFile("a.png")]);
    await store.resetAll(true);
    expect(store.getSnapshot().photos).toHaveLength(0);
    expect(store.getSnapshot().history).toHaveLength(0);
    expect(await getAllPhotos()).toHaveLength(0);
  });
});
