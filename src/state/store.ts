import {
  DEFAULT_SETTINGS,
  MAX_FILES_PER_IMPORT,
  type Category,
  type Collection,
  type Decision,
  type HistoryEntry,
  type Photo,
  type SessionState,
  type Settings,
} from "@/types";
import {
  addHistory,
  clearAll,
  deleteCollection as dbDeleteCollection,
  deletePhoto as dbDeletePhoto,
  estimateUsage,
  getAllCollections,
  getAllPhotos,
  getBlob,
  getHistory,
  loadSession,
  loadSettings,
  putBlob,
  putCollection,
  putPhoto,
  saveSession,
  saveSettings,
  setMeta,
} from "@/db/database";
import { classify } from "@/lib/classify";
import { createId, normalizeText } from "@/lib/utils";
import { readImageDimensions, validateFile } from "@/lib/image";
import { perceptualHash, sha256Hex } from "@/lib/hashing";
import { generateDemoImages } from "@/lib/demo";

export interface ImportIssue {
  name: string;
  reason: string;
}

export interface ImportReport {
  added: number;
  duplicates: number;
  rejected: ImportIssue[];
  cancelled: boolean;
}

export interface AppState {
  ready: boolean;
  photos: Photo[];
  collections: Collection[];
  settings: Settings;
  session: SessionState | null;
  history: HistoryEntry[];
  storage: { usage: number; quota: number } | null;
  error: string | null;
}

const BUILTIN_COLLECTIONS: Array<
  Pick<Collection, "name" | "icon" | "color" | "description">
> = [
  {
    name: "Recettes",
    icon: "ChefHat",
    color: "#c2410c",
    description: "Vos recettes et idées de cuisine.",
  },
  {
    name: "Voyages & événements",
    icon: "Plane",
    color: "#7c3aed",
    description: "Billets, réservations, concerts.",
  },
  {
    name: "Documents importants",
    icon: "FileText",
    color: "#0369a1",
    description: "Factures, contrats, attestations.",
  },
  {
    name: "Shopping",
    icon: "ShoppingBag",
    color: "#15803d",
    description: "Panier, articles, inspirations d'achat.",
  },
  {
    name: "Inspirations",
    icon: "Sparkles",
    color: "#be185d",
    description: "Citations et idées à garder.",
  },
  {
    name: "À revoir",
    icon: "Clock",
    color: "#b45309",
    description: "Images mises de côté, à traiter plus tard.",
  },
  {
    name: "Favoris",
    icon: "Heart",
    color: "#dc2626",
    description: "Vos images préférées, conservées.",
  },
];

function createBuiltinCollections(): Collection[] {
  const now = Date.now();
  return BUILTIN_COLLECTIONS.map((collection, index) => ({
    id: `col_${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...collection,
    builtin: true,
    createdAt: now + index,
  }));
}

type Listener = () => void;

export class AppStore {
  private state: AppState = {
    ready: false,
    photos: [],
    collections: [],
    settings: DEFAULT_SETTINGS,
    session: null,
    history: [],
    storage: null,
    error: null,
  };

  private listeners = new Set<Listener>();
  private initPromise: Promise<void> | null = null;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AppState => this.state;

  private setState(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      const [photos, collections, settings, session, history] = await Promise.all([
        getAllPhotos(),
        getAllCollections(),
        loadSettings(),
        loadSession(),
        getHistory(),
      ]);

      let finalCollections = collections;
      if (collections.length === 0) {
        finalCollections = createBuiltinCollections();
        await Promise.all(finalCollections.map((c) => putCollection(c)));
      }

      const migratedPhotos = await this.migratePhotos(photos);

      const storage = await estimateUsage();
      this.setState({
        ready: true,
        photos: migratedPhotos,
        collections: finalCollections,
        settings,
        session: this.sanitizeSession(session, migratedPhotos),
        history,
        storage,
      });
    } catch (error) {
      this.setState({
        ready: true,
        error:
          error instanceof Error
            ? `Impossible de charger vos données locales : ${error.message}`
            : "Impossible de charger vos données locales.",
      });
    }
  }

  /** Guards against photos stored by an older or corrupted schema. */
  private async migratePhotos(photos: Photo[]): Promise<Photo[]> {
    const validDecisions = ["keep", "collection", "later", "trash"];
    const validCategories = [
      "recipe",
      "ticket",
      "document",
      "screenshot",
      "inspiration",
      "shopping",
      "personal",
      "unknown",
    ];
    const validOcr = ["idle", "running", "done", "error", "unavailable"];
    const repaired: Photo[] = [];
    for (const photo of photos) {
      if (!photo || typeof photo.id !== "string") continue;
      const safe: Photo = {
        id: photo.id,
        name: typeof photo.name === "string" ? photo.name : "sans-nom",
        mimeType: typeof photo.mimeType === "string" ? photo.mimeType : "image/png",
        size: typeof photo.size === "number" ? photo.size : 0,
        width: typeof photo.width === "number" ? photo.width : 0,
        height: typeof photo.height === "number" ? photo.height : 0,
        importedAt: typeof photo.importedAt === "number" ? photo.importedAt : Date.now(),
        source: photo.source === "demo" ? "demo" : "import",
        blobKey: typeof photo.blobKey === "string" ? photo.blobKey : photo.id,
        exactHash: typeof photo.exactHash === "string" ? photo.exactHash : "",
        perceptualHash: typeof photo.perceptualHash === "string" ? photo.perceptualHash : "",
        ocrText: typeof photo.ocrText === "string" ? photo.ocrText : "",
        ocrStatus: validOcr.includes(photo.ocrStatus) ? photo.ocrStatus : "idle",
        ocrError: typeof photo.ocrError === "string" ? photo.ocrError : null,
        category: validCategories.includes(photo.category) ? photo.category : "unknown",
        categoryConfidence:
          typeof photo.categoryConfidence === "number" ? photo.categoryConfidence : 0,
        categorySource:
          photo.categorySource === "user" || photo.categorySource === "demo"
            ? photo.categorySource
            : "heuristic",
        decision: validDecisions.includes(photo.decision ?? "") ? photo.decision : null,
        collectionId: typeof photo.collectionId === "string" ? photo.collectionId : null,
        decidedAt: typeof photo.decidedAt === "number" ? photo.decidedAt : null,
        demoNote: typeof photo.demoNote === "string" ? photo.demoNote : null,
        recipe: photo.recipe ?? null,
      };
      repaired.push(safe);
      if (safe !== photo) await putPhoto(safe);
    }
    return repaired.sort((a, b) => a.importedAt - b.importedAt);
  }

  private sanitizeSession(
    session: SessionState | null,
    photos: Photo[],
  ): SessionState | null {
    if (!session || !Array.isArray(session.photoIds)) return null;
    const existing = new Set(photos.map((photo) => photo.id));
    const ids = session.photoIds.filter((id) => existing.has(id));
    if (ids.length === 0) return null;
    return { ...session, photoIds: ids };
  }

  /* ------------------------------------------------------------------ */
  /* Import                                                              */
  /* ------------------------------------------------------------------ */

  async importFiles(
    files: File[],
    onProgress?: (done: number, total: number, name: string) => void,
  ): Promise<ImportReport> {
    const report: ImportReport = { added: 0, duplicates: 0, rejected: [], cancelled: false };
    const total = Math.min(files.length, MAX_FILES_PER_IMPORT);
    if (files.length > MAX_FILES_PER_IMPORT) {
      report.rejected.push({
        name: `${files.length - MAX_FILES_PER_IMPORT} fichiers`,
        reason: `Limite de ${MAX_FILES_PER_IMPORT} fichiers par import`,
      });
    }

    const existingHashes = new Set(this.state.photos.map((photo) => photo.exactHash));
    const newPhotos: Photo[] = [];

    for (let index = 0; index < total; index += 1) {
      const file = files[index];
      if (!file) continue;
      onProgress?.(index, total, file.name);
      try {
        const validation = validateFile(file);
        if (!validation.ok) {
          report.rejected.push({ name: file.name, reason: validation.reason });
          continue;
        }

        const exactHash = await sha256Hex(file);
        const duplicate = existingHashes.has(exactHash);
        if (duplicate) report.duplicates += 1;

        const dimensions = await readImageDimensions(file);
        const phash = await perceptualHash(file).catch(() => "");
        const blobKey = `blob_${exactHash}`;

        const alreadyStored = await getBlob(blobKey);
        if (!alreadyStored) await putBlob(blobKey, file);

        const classification = classify({
          text: "",
          filename: file.name,
          width: dimensions.width,
          height: dimensions.height,
        });

        const photo: Photo = {
          id: createId("ph"),
          name: file.name,
          mimeType: validation.mimeType,
          size: file.size,
          width: dimensions.width,
          height: dimensions.height,
          importedAt: Date.now(),
          source: "import",
          blobKey,
          exactHash,
          perceptualHash: phash,
          ocrText: "",
          ocrStatus: "idle",
          ocrError: null,
          category: classification.category,
          categoryConfidence: classification.confidence,
          categorySource: "heuristic",
          decision: null,
          collectionId: null,
          decidedAt: null,
          demoNote: null,
          recipe: null,
        };

        await putPhoto(photo);
        existingHashes.add(exactHash);
        newPhotos.push(photo);
        report.added += 1;
      } catch (error) {
        report.rejected.push({
          name: file.name,
          reason: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    onProgress?.(total, total, "");
    if (newPhotos.length > 0) {
      const photos = [...this.state.photos, ...newPhotos].sort(
        (a, b) => a.importedAt - b.importedAt,
      );
      this.setState({ photos });
      await this.ensureSession(photos);
    }
    await this.refreshStorage();
    return report;
  }

  async importDemo(): Promise<ImportReport> {
    const report: ImportReport = { added: 0, duplicates: 0, rejected: [], cancelled: false };
    try {
      const generated = await generateDemoImages();
      const newPhotos: Photo[] = [];
      const existingHashes = new Set(this.state.photos.map((photo) => photo.exactHash));

      for (const item of generated) {
        const exactHash = await sha256Hex(item.blob);
        if (existingHashes.has(exactHash)) report.duplicates += 1;
        const phash = await perceptualHash(item.blob).catch(() => "");
        const blobKey = `blob_${exactHash}`;
        const alreadyStored = await getBlob(blobKey);
        if (!alreadyStored) await putBlob(blobKey, item.blob);

        const photo: Photo = {
          id: createId("demo"),
          name: item.spec.name,
          mimeType: "image/png",
          size: item.blob.size,
          width: 900,
          height: 1200,
          importedAt: Date.now() + newPhotos.length,
          source: "demo",
          blobKey,
          exactHash,
          perceptualHash: phash,
          ocrText: item.spec.ocrText,
          ocrStatus: "done",
          ocrError: null,
          category: item.spec.category,
          categoryConfidence: 0.9,
          categorySource: "demo",
          decision: null,
          collectionId: null,
          decidedAt: null,
          demoNote: item.spec.note,
          recipe: null,
        };
        await putPhoto(photo);
        existingHashes.add(exactHash);
        newPhotos.push(photo);
        report.added += 1;
      }

      if (newPhotos.length > 0) {
        const photos = [...this.state.photos, ...newPhotos].sort(
          (a, b) => a.importedAt - b.importedAt,
        );
        this.setState({ photos });
        await setMeta("demoLoaded", true);
        await this.ensureSession(photos);
      }
      await this.refreshStorage();
    } catch (error) {
      report.rejected.push({
        name: "Démo",
        reason: error instanceof Error ? error.message : "Génération impossible",
      });
    }
    return report;
  }

  /* ------------------------------------------------------------------ */
  /* Decisions                                                           */
  /* ------------------------------------------------------------------ */

  async decide(
    photoId: string,
    decision: Decision,
    collectionId: string | null = null,
  ): Promise<void> {
    const photo = this.state.photos.find((item) => item.id === photoId);
    if (!photo) return;

    const before = {
      decision: photo.decision,
      collectionId: photo.collectionId,
      decidedAt: photo.decidedAt,
    };
    const after = {
      decision,
      collectionId:
        decision === "collection"
          ? collectionId
          : decision === "keep"
            ? null
            : collectionId,
      decidedAt: Date.now(),
    };

    const updated: Photo = {
      ...photo,
      decision: after.decision,
      collectionId: after.collectionId,
      decidedAt: after.decidedAt,
    };

    const entry: HistoryEntry = {
      id: createId("h"),
      photoId,
      at: Date.now(),
      action: "decide",
      before,
      after,
      label: `${decision} — ${photo.name}`,
    };

    await putPhoto(updated);
    await addHistory(entry);

    this.setState({
      photos: this.state.photos.map((item) => (item.id === photoId ? updated : item)),
      history: [...this.state.history, entry].slice(-500),
    });
  }

  async undo(): Promise<boolean> {
    const last = [...this.state.history]
      .reverse()
      .find((entry) => entry.action === "decide");
    if (!last) return false;
    const photo = this.state.photos.find((item) => item.id === last.photoId);
    if (!photo) return false;

    const reverted: Photo = {
      ...photo,
      decision: last.before.decision,
      collectionId: last.before.collectionId,
      decidedAt: last.before.decidedAt,
    };
    const revertEntry: HistoryEntry = {
      id: createId("h"),
      photoId: photo.id,
      at: Date.now(),
      action: "revert",
      before: last.after,
      after: last.before,
      label: `annulation — ${photo.name}`,
    };

    await putPhoto(reverted);
    await addHistory(revertEntry);
    this.setState({
      photos: this.state.photos.map((item) => (item.id === photo.id ? reverted : item)),
      history: [...this.state.history, revertEntry].slice(-500),
    });
    return true;
  }

  canUndo(): boolean {
    return this.state.history.some((entry) => entry.action === "decide");
  }

  async setCategory(photoId: string, category: Category): Promise<void> {
    const photo = this.state.photos.find((item) => item.id === photoId);
    if (!photo) return;
    const updated: Photo = {
      ...photo,
      category,
      categorySource: "user",
      categoryConfidence: 1,
    };
    await putPhoto(updated);
    this.setState({
      photos: this.state.photos.map((item) => (item.id === photoId ? updated : item)),
    });
  }

  async setRecipe(photoId: string, recipe: Photo["recipe"]): Promise<void> {
    await this.patchPhoto(photoId, { recipe });
  }

  async analyzePhoto(
    photoId: string,
    onProgress?: (progress: number, status: string) => void,
  ): Promise<void> {
    const photo = this.state.photos.find((item) => item.id === photoId);
    if (!photo || photo.ocrStatus === "running") return;
    await this.patchPhoto(photoId, { ocrStatus: "running", ocrError: null });

    try {
      const blob = await getBlob(photo.blobKey);
      if (!blob) throw new Error("Image introuvable dans le stockage local");
      const { recognizeText } = await import("@/lib/ocr");
      const { downscaleBlob } = await import("@/lib/image");
      const prepared = await downscaleBlob(blob, 1800).catch(() => blob);
      const { text } = await recognizeText(prepared, this.state.settings.language, onProgress);
      const classification = classify({
        text,
        filename: photo.name,
        width: photo.width,
        height: photo.height,
      });
      await this.patchPhoto(photoId, {
        ocrText: text,
        ocrStatus: "done",
        category: classification.category,
        categoryConfidence: classification.confidence,
        categorySource: "heuristic",
      });
    } catch (error) {
      await this.patchPhoto(photoId, {
        ocrStatus: "error",
        ocrError: error instanceof Error ? error.message : "Échec de l'analyse",
      });
    }
  }

  private async patchPhoto(photoId: string, patch: Partial<Photo>): Promise<void> {
    const photo = this.state.photos.find((item) => item.id === photoId);
    if (!photo) return;
    const updated: Photo = { ...photo, ...patch };
    await putPhoto(updated);
    this.setState({
      photos: this.state.photos.map((item) => (item.id === photoId ? updated : item)),
    });
  }

  /* ------------------------------------------------------------------ */
  /* Collections                                                         */
  /* ------------------------------------------------------------------ */

  async createCollection(name: string): Promise<Collection | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const collection: Collection = {
      id: createId("col"),
      name: trimmed,
      icon: "Folder",
      color: "#2f6bff",
      builtin: false,
      description: "",
      createdAt: Date.now(),
    };
    await putCollection(collection);
    this.setState({ collections: [...this.state.collections, collection] });
    return collection;
  }

  async renameCollection(id: string, name: string): Promise<void> {
    const collection = this.state.collections.find((item) => item.id === id);
    const trimmed = name.trim();
    if (!collection || !trimmed) return;
    const updated = { ...collection, name: trimmed };
    await putCollection(updated);
    this.setState({
      collections: this.state.collections.map((item) => (item.id === id ? updated : item)),
    });
  }

  async deleteCollection(id: string): Promise<void> {
    await dbDeleteCollection(id);
    const affected = this.state.photos.filter((photo) => photo.collectionId === id);
    const updatedPhotos = this.state.photos.map((photo) =>
      photo.collectionId === id ? { ...photo, collectionId: null } : photo,
    );
    await Promise.all(affected.map((photo) => putPhoto({ ...photo, collectionId: null })));
    this.setState({
      collections: this.state.collections.filter((item) => item.id !== id),
      photos: updatedPhotos,
    });
  }

  async assignCollection(photoId: string, collectionId: string): Promise<void> {
    const photo = this.state.photos.find((item) => item.id === photoId);
    if (!photo) return;
    const before = {
      decision: photo.decision,
      collectionId: photo.collectionId,
      decidedAt: photo.decidedAt,
    };
    const updated: Photo = {
      ...photo,
      collectionId,
      decision: photo.decision ?? "collection",
      decidedAt: photo.decidedAt ?? Date.now(),
    };
    const entry: HistoryEntry = {
      id: createId("h"),
      photoId,
      at: Date.now(),
      action: "decide",
      before,
      after: {
        decision: updated.decision,
        collectionId,
        decidedAt: updated.decidedAt,
      },
      label: `classement — ${photo.name}`,
    };
    await putPhoto(updated);
    await addHistory(entry);
    this.setState({
      photos: this.state.photos.map((item) => (item.id === photoId ? updated : item)),
      history: [...this.state.history, entry].slice(-500),
    });
  }

  async removeFromCollection(photoId: string): Promise<void> {
    await this.patchPhoto(photoId, { collectionId: null });
  }

  async removePhoto(photoId: string): Promise<void> {
    const photo = this.state.photos.find((item) => item.id === photoId);
    if (!photo) return;
    const stillReferenced = this.state.photos.some(
      (item) => item.id !== photoId && item.blobKey === photo.blobKey,
    );
    await dbDeletePhoto(photoId, !stillReferenced);
    this.setState({
      photos: this.state.photos.filter((item) => item.id !== photoId),
      session: this.state.session
        ? {
            ...this.state.session,
            photoIds: this.state.session.photoIds.filter((id) => id !== photoId),
          }
        : null,
    });
    if (this.state.session) await saveSession(this.state.session);
  }

  async emptyTrash(): Promise<void> {
    const trash = this.state.photos.filter((photo) => photo.decision === "trash");
    for (const photo of trash) {
      await dbDeletePhoto(photo.id);
    }
    this.setState({ photos: this.state.photos.filter((photo) => photo.decision !== "trash") });
    await this.refreshStorage();
  }

  /* ------------------------------------------------------------------ */
  /* Session                                                             */
  /* ------------------------------------------------------------------ */

  async ensureSession(photos = this.state.photos): Promise<SessionState> {
    const existing = this.state.session;
    if (existing) {
      const stillValid = existing.photoIds.some((id) =>
        photos.some((photo) => photo.id === id && photo.decision === null),
      );
      if (stillValid) return existing;
    }
    return this.startSession(this.state.settings.sessionSize, photos);
  }

  async startSession(
    size: number,
    photos = this.state.photos,
  ): Promise<SessionState> {
    const undecided = photos
      .filter((photo) => photo.decision === null)
      .sort((a, b) => a.importedAt - b.importedAt)
      .slice(0, size);
    const session: SessionState = {
      id: createId("session"),
      startedAt: Date.now(),
      photoIds: undecided.map((photo) => photo.id),
      size,
    };
    await saveSession(session);
    this.setState({ session });
    return session;
  }

  async endSession(): Promise<void> {
    await saveSession(null);
    this.setState({ session: null });
  }

  /* ------------------------------------------------------------------ */
  /* Settings / maintenance                                              */
  /* ------------------------------------------------------------------ */

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const settings = { ...this.state.settings, ...patch };
    await saveSettings(settings);
    this.setState({ settings });
  }

  async resetDemo(): Promise<number> {
    const demoPhotos = this.state.photos.filter((photo) => photo.source === "demo");
    if (demoPhotos.length === 0) return 0;
    const demoIds = new Set(demoPhotos.map((photo) => photo.id));
    for (const photo of demoPhotos) {
      const referenced = this.state.photos.some(
        (item) => !demoIds.has(item.id) && item.blobKey === photo.blobKey,
      );
      await dbDeletePhoto(photo.id, !referenced);
    }
    const photos = this.state.photos.filter((photo) => !demoIds.has(photo.id));
    const session =
      this.state.session && this.state.session.photoIds.some((id) => !demoIds.has(id))
        ? {
            ...this.state.session,
            photoIds: this.state.session.photoIds.filter((id) => !demoIds.has(id)),
          }
        : null;
    await saveSession(session);
    await setMeta("demoLoaded", false);
    this.setState({ photos, session });
    await this.refreshStorage();
    return demoPhotos.length;
  }

  async resetAll(keepSettings = false): Promise<void> {
    const settings = this.state.settings;
    await clearAll();
    const collections = createBuiltinCollections();
    await Promise.all(collections.map((collection) => putCollection(collection)));
    if (keepSettings) await saveSettings(settings);
    this.setState({
      photos: [],
      collections,
      session: null,
      history: [],
      settings: keepSettings ? settings : DEFAULT_SETTINGS,
      error: null,
    });
    await this.refreshStorage();
  }

  async refreshStorage(): Promise<void> {
    const storage = await estimateUsage();
    this.setState({ storage });
  }

  async exportData(): Promise<string> {
    const payload = {
      app: "SnapSort",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.state.settings,
      collections: this.state.collections,
      photos: this.state.photos.map((photo) => ({
        ...photo,
        hasBlob: true,
      })),
      history: this.state.history,
      note: "Les fichiers image ne sont pas inclus : seules les métadonnées et le texte OCR sont exportés.",
    };
    return JSON.stringify(payload, null, 2);
  }

  getPhotoById(id: string): Photo | undefined {
    return this.state.photos.find((photo) => photo.id === id);
  }

  async getBlobFor(photo: Photo): Promise<Blob | undefined> {
    return getBlob(photo.blobKey);
  }

  static normalize(value: string): string {
    return normalizeText(value);
  }
}

let singleton: AppStore | null = null;

export function getStore(): AppStore {
  if (!singleton) singleton = new AppStore();
  return singleton;
}

export async function loadPhotoBlob(photo: Photo): Promise<Blob | undefined> {
  return getBlob(photo.blobKey);
}
