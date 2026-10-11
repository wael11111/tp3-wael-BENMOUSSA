/** Byte-level helpers that never throw: corrupted files degrade gracefully. */

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

/** SHA-256 of the raw file content. Used to detect exact duplicates. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", buffer);
    return bytesToHex(new Uint8Array(digest));
  }
  return fnv1aHex(new Uint8Array(buffer));
}

/** Non-cryptographic fallback so hashing still works without WebCrypto. */
export function fnv1aHex(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv-${hash.toString(16).padStart(8, "0")}-${bytes.length}`;
}

function grayscale(data: Uint8ClampedArray, i: number): number {
  const r = data[i] ?? 0;
  const g = data[i + 1] ?? 0;
  const b = data[i + 2] ?? 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function bitsToHex(bits: string): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4).padEnd(4, "0"), 2).toString(16);
  }
  return hex;
}

/**
 * Difference hash (dHash) computed on a 9x8 grayscale thumbnail.
 * 64 bits, returned as 16 hex characters. Robust to scaling and light
 * recompression, which is exactly what we need for "similar" detection.
 */
export async function perceptualHash(blob: Blob): Promise<string> {
  const canvas = document.createElement("canvas");
  const width = 9;
  const height = 8;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  let source: CanvasImageSource;
  let close: (() => void) | undefined;
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    source = bitmap;
    close = () => bitmap.close();
  } else {
    source = await loadImageElement(blob);
  }

  try {
    ctx.drawImage(source, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    let bits = "";
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width - 1; x += 1) {
        const left = grayscale(data, (y * width + x) * 4);
        const right = grayscale(data, (y * width + x + 1) * 4);
        bits += left > right ? "1" : "0";
      }
    }
    return bitsToHex(bits);
  } finally {
    close?.();
  }
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });
}

export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    let xor = parseInt(a[i] ?? "0", 16) ^ parseInt(b[i] ?? "0", 16);
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/** dHash distance of <= 8 bits out of 64 is a strong "visually similar" signal. */
export const SIMILAR_THRESHOLD = 8;

export function imagesAreSimilar(a: string, b: string): boolean {
  return hammingDistance(a, b) <= SIMILAR_THRESHOLD;
}
