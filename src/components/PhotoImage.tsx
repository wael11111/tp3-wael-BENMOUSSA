import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { Photo } from "@/types";
import { usePhotoUrl } from "@/state/useStore";
import { cn } from "@/lib/cn";

interface PhotoImageProps {
  photo: Photo | undefined;
  alt?: string;
  className?: string;
  imgClassName?: string;
  contain?: boolean;
}

/**
 * Renders a stored image from IndexedDB with a skeleton while loading and a
 * readable fallback if the blob is missing or corrupted.
 */
export function PhotoImage({
  photo,
  alt,
  className,
  imgClassName,
  contain = false,
}: PhotoImageProps) {
  const { url, loading, error } = usePhotoUrl(photo);
  const [broken, setBroken] = useState(false);

  if (loading) {
    return <div className={cn("skeleton", className)} aria-hidden />;
  }

  if (error || broken || !url) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-cream-deep text-muted",
          className,
        )}
        role="img"
        aria-label="Image indisponible"
      >
        <ImageOff size={22} />
        <span className="text-xs">Image indisponible</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? photo?.name ?? "Image"}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn(contain ? "object-contain" : "object-cover", "h-full w-full", imgClassName)}
      draggable={false}
    />
  );
}
