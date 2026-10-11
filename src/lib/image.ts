import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/types";

export interface ImageDimensions {
  width: number;
  height: number;
}

export type FileValidation =
  | { ok: true; mimeType: string }
  | { ok: false; reason: string };

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1).toLowerCase();
}

/**
 * Validates a user file before it ever reaches the queue. Never throws:
 * every rejection is a readable, actionable message.
 */
export function validateFile(file: File): FileValidation {
  if (file.size === 0) {
    return { ok: false, reason: "Fichier vide" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `Fichier trop volumineux (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} Mo)`,
    };
  }
  const ext = extensionOf(file.name);
  const declared = (file.type || "").toLowerCase();
  const byExtension = EXTENSION_TO_MIME[ext];
  const mimeType =
    (ACCEPTED_MIME as readonly string[]).includes(declared) ? declared : byExtension;
  if (!mimeType) {
    return {
      ok: false,
      reason: `Format non pris en charge (.${ext || "?"}) — JPEG, PNG ou WebP attendu`,
    };
  }
  return { ok: true, mimeType };
}

export function readImageDimensions(blob: Blob): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(url);
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      cleanup();
      if (!width || !height) {
        reject(new Error("Dimensions illisibles"));
        return;
      }
      resolve({ width, height });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Image illisible ou corrompue"));
    };
    image.src = url;
  });
}

/**
 * Produces a downscaled JPEG copy. Used to keep OCR fast on huge screenshots
 * and to bound the memory footprint of the canvas pipeline.
 */
export async function downscaleBlob(
  blob: Blob,
  maxDimension = 1600,
): Promise<Blob> {
  const { width, height } = await readImageDimensions(blob);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  if (scale >= 1) return blob;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;

  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const out = await canvasToBlob(canvas);
    return out ?? blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image illisible"));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
  });
}
