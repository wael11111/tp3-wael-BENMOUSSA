import type { Collection, Photo, SessionState, Suggestion } from "@/types";
import { buildSuggestions } from "@/lib/classify";
import { hammingDistance, imagesAreSimilar } from "@/lib/hashing";
import { computeStreak, isSameDay, normalizeText } from "@/lib/utils";

export function getUndecided(photos: Photo[]): Photo[] {
  return photos
    .filter((photo) => photo.decision === null)
    .sort((a, b) => a.importedAt - b.importedAt);
}

export function getQueue(photos: Photo[], session: SessionState | null): Photo[] {
  if (!session) return getUndecided(photos);
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  return session.photoIds
    .map((id) => byId.get(id))
    .filter((photo): photo is Photo => Boolean(photo))
    .filter((photo) => photo.decision === null);
}

export function getSessionProgress(
  photos: Photo[],
  session: SessionState | null,
): { done: number; total: number; remaining: number; complete: boolean } {
  if (!session) {
    const undecided = getUndecided(photos).length;
    return { done: 0, total: 0, remaining: undecided, complete: false };
  }
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  let done = 0;
  for (const id of session.photoIds) {
    const photo = byId.get(id);
    if (photo && photo.decision !== null) done += 1;
  }
  const total = session.photoIds.length;
  return {
    done,
    total,
    remaining: total - done,
    complete: total > 0 && done >= total,
  };
}

export interface Stats {
  total: number;
  decided: number;
  kept: number;
  trashed: number;
  later: number;
  collected: number;
  todayDecided: number;
  streak: number;
  byCategory: Record<string, number>;
  byCollection: Record<string, number>;
}

export function getStats(photos: Photo[], history: { at: number }[] = []): Stats {
  const stats: Stats = {
    total: photos.length,
    decided: 0,
    kept: 0,
    trashed: 0,
    later: 0,
    collected: 0,
    todayDecided: 0,
    streak: 0,
    byCategory: {},
    byCollection: {},
  };
  const activity: number[] = [];
  const now = Date.now();

  for (const photo of photos) {
    stats.byCategory[photo.category] = (stats.byCategory[photo.category] ?? 0) + 1;
    if (photo.decision !== null) {
      stats.decided += 1;
      if (photo.decidedAt) activity.push(photo.decidedAt);
      if (photo.decidedAt && isSameDay(photo.decidedAt, now)) stats.todayDecided += 1;
      if (photo.decision === "keep") stats.kept += 1;
      if (photo.decision === "trash") stats.trashed += 1;
      if (photo.decision === "later") stats.later += 1;
      if (photo.decision === "collection") stats.collected += 1;
    }
    if (photo.collectionId) {
      stats.byCollection[photo.collectionId] =
        (stats.byCollection[photo.collectionId] ?? 0) + 1;
    }
  }

  for (const entry of history) activity.push(entry.at);
  stats.streak = computeStreak(activity, now);
  return stats;
}

export function getCollectionPhotos(photos: Photo[], collectionId: string): Photo[] {
  return photos
    .filter((photo) => photo.collectionId === collectionId)
    .sort((a, b) => (b.decidedAt ?? b.importedAt) - (a.decidedAt ?? a.importedAt));
}

export function getTrash(photos: Photo[]): Photo[] {
  return photos.filter((photo) => photo.decision === "trash");
}

export function getDuplicateGroups(photos: Photo[]): Photo[][] {
  const groups = new Map<string, Photo[]>();
  for (const photo of photos) {
    if (!photo.exactHash) continue;
    const list = groups.get(photo.exactHash) ?? [];
    list.push(photo);
    groups.set(photo.exactHash, list);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function getSimilarPairs(photos: Photo[]): Array<{ a: Photo; b: Photo; distance: number }> {
  const pairs: Array<{ a: Photo; b: Photo; distance: number }> = [];
  const withHash = photos.filter((photo) => photo.perceptualHash);
  for (let i = 0; i < withHash.length; i += 1) {
    for (let j = i + 1; j < withHash.length; j += 1) {
      const a = withHash[i];
      const b = withHash[j];
      if (!a || !b) continue;
      if (a.exactHash && a.exactHash === b.exactHash) continue;
      if (imagesAreSimilar(a.perceptualHash, b.perceptualHash)) {
        pairs.push({ a, b, distance: hammingDistance(a.perceptualHash, b.perceptualHash) });
      }
    }
  }
  return pairs;
}

export function getSuggestions(
  photo: Photo,
  photos: Photo[],
  collections: Collection[],
): Suggestion[] {
  const duplicateOf =
    photos.find((item) => item.id !== photo.id && item.exactHash === photo.exactHash) ?? null;

  const similarTo = photos
    .filter(
      (item) =>
        item.id !== photo.id &&
        item.perceptualHash &&
        photo.perceptualHash &&
        item.exactHash !== photo.exactHash,
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      distance: hammingDistance(photo.perceptualHash, item.perceptualHash),
    }))
    .filter((item) => item.distance <= 8 && Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  return buildSuggestions(photo, {
    duplicateOf: duplicateOf ? { id: duplicateOf.id, name: duplicateOf.name } : null,
    similarTo,
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
    })),
  });
}

export function searchPhotos(
  photos: Photo[],
  collections: Collection[],
  query: string,
): Photo[] {
  const trimmed = query.trim();
  if (!trimmed) return photos;
  const needle = normalizeText(trimmed);
  const collectionNames = new Map(collections.map((c) => [c.id, normalizeText(c.name)]));
  return photos.filter((photo) => {
    const haystacks = [
      normalizeText(photo.name),
      normalizeText(photo.ocrText),
      normalizeText(photo.category),
      photo.collectionId ? collectionNames.get(photo.collectionId) ?? "" : "",
    ];
    return haystacks.some((value) => value.includes(needle));
  });
}

export function groupByDay(photos: Photo[]): Array<{ key: string; photos: Photo[] }> {
  const groups = new Map<string, Photo[]>();
  for (const photo of photos) {
    const date = new Date(photo.decidedAt ?? photo.importedAt);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const list = groups.get(key) ?? [];
    list.push(photo);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({ key, photos: list }));
}
