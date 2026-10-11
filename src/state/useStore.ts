import { useEffect, useState, useSyncExternalStore } from "react";
import type { Photo } from "@/types";
import { getBlob } from "@/db/database";
import { getStore, type AppStore, type AppState } from "./store";

export function useAppState(): AppState {
  const store = getStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useAppStore(): AppStore {
  return getStore();
}

/**
 * Resolves a stored blob into an object URL for display. The URL is always
 * revoked when the component unmounts or the photo changes.
 */
export function usePhotoUrl(photo: Photo | undefined): {
  url: string | null;
  loading: boolean;
  error: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(photo));
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (!photo) {
      setUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    getBlob(photo.blobKey)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setError(true);
          setUrl(null);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

  return { url, loading, error };
}
