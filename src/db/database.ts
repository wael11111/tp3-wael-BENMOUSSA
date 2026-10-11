import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DEFAULT_SETTINGS,
  type Collection,
  type HistoryEntry,
  type Photo,
  type SessionState,
  type Settings,
  type StoredBlob,
} from "@/types";

export const DB_NAME = "snapsort";
export const SCHEMA_VERSION = 1;

interface SnapSortDB extends DBSchema {
  photos: {
    key: string;
    value: Photo;
    indexes: {
      "by-decision": string;
      "by-importedAt": number;
      "by-exactHash": string;
      "by-collection": string;
    };
  };
  blobs: {
    key: string;
    value: StoredBlob;
  };
  collections: {
    key: string;
    value: Collection;
  };
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { "by-at": number };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

export type SnapSortDatabase = IDBPDatabase<SnapSortDB>;

let dbPromise: Promise<SnapSortDatabase> | null = null;

function openDatabase(): Promise<SnapSortDatabase> {
  return openDB<SnapSortDB>(DB_NAME, SCHEMA_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains("photos")) {
        const photos = db.createObjectStore("photos", { keyPath: "id" });
        photos.createIndex("by-decision", "decision");
        photos.createIndex("by-importedAt", "importedAt");
        photos.createIndex("by-exactHash", "exactHash");
        photos.createIndex("by-collection", "collectionId");
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("collections")) {
        db.createObjectStore("collections", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("history")) {
        const history = db.createObjectStore("history", { keyPath: "id" });
        history.createIndex("by-at", "at");
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
      void oldVersion;
    },
    blocked() {
      console.warn("SnapSort: mise à jour de la base bloquée par un autre onglet.");
    },
    blocking() {
      console.warn("SnapSort: une autre version de l'application est ouverte.");
    },
    terminated() {
      console.error("SnapSort: connexion à la base interrompue.");
    },
  });
}

export function getDb(): Promise<SnapSortDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/** Reset the cached connection. Used by tests and after a full wipe. */
export function resetDbConnection(): void {
  dbPromise = null;
}

/* ------------------------------------------------------------------ */
/* Meta (settings, session, migration marker)                          */
/* ------------------------------------------------------------------ */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get("meta", key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("meta", key);
}

export async function loadSettings(): Promise<Settings> {
  const stored = await getMeta<Partial<Settings>>("settings");
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setMeta("settings", settings);
}

export async function loadSession(): Promise<SessionState | null> {
  const stored = await getMeta<SessionState>("session");
  if (!stored || !Array.isArray(stored.photoIds)) return null;
  return stored;
}

export async function saveSession(session: SessionState | null): Promise<void> {
  if (session === null) {
    await deleteMeta("session");
  } else {
    await setMeta("session", session);
  }
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

export async function getAllPhotos(): Promise<Photo[]> {
  const db = await getDb();
  const photos = await db.getAll("photos");
  return photos.sort((a, b) => a.importedAt - b.importedAt);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDb();
  return db.get("photos", id);
}

export async function putPhoto(photo: Photo): Promise<void> {
  const db = await getDb();
  await db.put("photos", photo);
}

export async function putPhotos(photos: Photo[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("photos", "readwrite");
  await Promise.all([...photos.map((p) => tx.store.put(p)), tx.done]);
}

export async function deletePhoto(id: string, deleteBlob = true): Promise<void> {
  const db = await getDb();
  const photo = await db.get("photos", id);
  const tx = db.transaction(["photos", "blobs"], "readwrite");
  await tx.objectStore("photos").delete(id);
  if (photo && deleteBlob) {
    const remaining = await tx.objectStore("photos").getAll();
    const referenced = remaining.some(
      (item) => item.id !== id && item.blobKey === photo.blobKey,
    );
    if (!referenced) await tx.objectStore("blobs").delete(photo.blobKey);
  }
  await tx.done;
}

export async function findByExactHash(hash: string): Promise<Photo | undefined> {
  const db = await getDb();
  return db.getFromIndex("photos", "by-exactHash", hash);
}

/* ------------------------------------------------------------------ */
/* Blobs                                                               */
/* ------------------------------------------------------------------ */

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put("blobs", { key, blob });
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await getDb();
  const row = await db.get("blobs", key);
  return row?.blob;
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("blobs", key);
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export async function getAllCollections(): Promise<Collection[]> {
  const db = await getDb();
  const collections = await db.getAll("collections");
  return collections.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putCollection(collection: Collection): Promise<void> {
  const db = await getDb();
  await db.put("collections", collection);
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("collections", id);
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export async function getHistory(limit = 200): Promise<HistoryEntry[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("history", "by-at");
  return all.slice(-limit);
}

export async function addHistory(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  await db.put("history", entry);
}

export async function deleteHistory(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("history", id);
}

/* ------------------------------------------------------------------ */
/* Danger zone                                                         */
/* ------------------------------------------------------------------ */

export async function clearAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ["photos", "blobs", "collections", "history", "meta"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("photos").clear(),
    tx.objectStore("blobs").clear(),
    tx.objectStore("collections").clear(),
    tx.objectStore("history").clear(),
    tx.objectStore("meta").clear(),
    tx.done,
  ]);
}

export async function estimateUsage(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
