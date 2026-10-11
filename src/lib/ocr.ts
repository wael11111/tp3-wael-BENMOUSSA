import type { Worker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence: number;
}

export type OcrProgress = (progress: number, status: string) => void;

let activeWorker: Worker | null = null;
let activeLang: string | null = null;
let loading: Promise<Worker> | null = null;

export function isOcrSupported(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof createImageBitmap !== "undefined"
  );
}

async function getWorker(lang: string, onProgress?: OcrProgress): Promise<Worker> {
  if (activeWorker && activeLang === lang) return activeWorker;
  if (activeWorker) {
    await activeWorker.terminate();
    activeWorker = null;
    activeLang = null;
  }
  if (!loading) {
    loading = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (message: { status: string; progress: number }) => {
          onProgress?.(message.progress ?? 0, message.status ?? "…");
        },
      });
      activeWorker = worker;
      activeLang = lang;
      return worker;
    })();
  }
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/**
 * Runs OCR on an image. The engine is loaded lazily so the initial bundle
 * stays small; progress is reported for the "reading…" state in the UI.
 */
export async function recognizeText(
  blob: Blob,
  lang: string,
  onProgress?: OcrProgress,
): Promise<OcrResult> {
  if (!isOcrSupported()) {
    throw new Error("L'OCR n'est pas disponible dans ce navigateur.");
  }
  const worker = await getWorker(lang, onProgress);
  const { data } = await worker.recognize(blob);
  const text = (data.text ?? "").replace(/\n{3,}/g, "\n\n").trim();
  return { text, confidence: Math.round(data.confidence ?? 0) / 100 };
}

export async function terminateOcr(): Promise<void> {
  if (activeWorker) {
    await activeWorker.terminate();
    activeWorker = null;
    activeLang = null;
  }
}
