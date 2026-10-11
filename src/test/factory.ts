import type { Photo } from "@/types";

let counter = 0;

export function makePhoto(overrides: Partial<Photo> = {}): Photo {
  counter += 1;
  return {
    id: `ph_${counter}`,
    name: `photo-${counter}.png`,
    mimeType: "image/png",
    size: 1024,
    width: 800,
    height: 600,
    importedAt: counter,
    source: "import",
    blobKey: `blob_${counter}`,
    exactHash: `hash-${counter}`,
    perceptualHash: "0000000000000000",
    ocrText: "",
    ocrStatus: "idle",
    ocrError: null,
    category: "unknown",
    categoryConfidence: 0.2,
    categorySource: "heuristic",
    decision: null,
    collectionId: null,
    decidedAt: null,
    demoNote: null,
    recipe: null,
    ...overrides,
  };
}
