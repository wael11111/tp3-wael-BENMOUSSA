import { useRef } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, Clock3, Trash2 } from "lucide-react";
import type { Decision, Photo } from "@/types";
import { PhotoImage } from "@/components/PhotoImage";
import { CategoryBadge } from "@/components/CategoryBadge";
import { cn } from "@/lib/cn";

interface SwipeCardProps {
  photo: Photo;
  onDecide: (decision: Decision) => void;
  disabled?: boolean;
  stackDepth?: number;
}

const THRESHOLD = 110;

export function SwipeCard({ photo, onDecide, disabled, stackDepth = 0 }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const keepOpacity = useTransform(x, [30, 130], [0, 1]);
  const trashOpacity = useTransform(x, [-130, -30], [1, 0]);
  const laterOpacity = useTransform(y, [-130, -40], [1, 0]);
  const busy = useRef(false);

  const flyOut = (decision: Decision, direction: { x: number; y: number }) => {
    if (busy.current) return;
    busy.current = true;
    void Promise.all([
      animate(x, direction.x, { duration: 0.26, ease: "easeIn" }),
      animate(y, direction.y, { duration: 0.26, ease: "easeIn" }),
    ]).then(() => {
      busy.current = false;
      onDecide(decision);
    });
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (disabled) return;
    const offsetX = info.offset.x;
    const offsetY = info.offset.y;
    if (Math.abs(offsetX) > Math.abs(offsetY)) {
      if (offsetX > THRESHOLD || info.velocity.x > 620) {
        flyOut("keep", { x: 520, y: offsetY });
        return;
      }
      if (offsetX < -THRESHOLD || info.velocity.x < -620) {
        flyOut("trash", { x: -520, y: offsetY });
        return;
      }
    } else if (offsetY < -THRESHOLD || info.velocity.y < -620) {
      flyOut("later", { x: offsetX, y: -560 });
      return;
    }
    void Promise.all([
      animate(x, 0, { type: "spring", stiffness: 420, damping: 34 }),
      animate(y, 0, { type: "spring", stiffness: 420, damping: 34 }),
    ]);
  };

  return (
    <motion.div
      drag={disabled ? false : true}
      dragSnapToOrigin
      dragElastic={0.16}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate }}
      whileTap={{ cursor: "grabbing" }}
      className={cn(
        "absolute inset-0 cursor-grab touch-none overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[var(--shadow-lift)]",
        stackDepth > 0 && "pointer-events-none",
      )}
      aria-label={`Image ${photo.name}. Glissez pour décider.`}
    >
      <PhotoImage photo={photo} contain className="h-full w-full bg-[#eee7d8]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-ink/45 to-transparent p-4">
        <CategoryBadge category={photo.category} confidence={photo.categoryConfidence} />
        {photo.ocrStatus === "done" && photo.ocrText ? (
          <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[0.68rem] font-semibold text-ink-soft backdrop-blur">
            Texte lu
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent p-4">
        <p className="truncate text-sm font-medium text-cream">{photo.name}</p>
      </div>

      <motion.div
        style={{ opacity: keepOpacity }}
        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 rotate-[-8deg] rounded-2xl border-4 border-moss bg-moss/10 px-4 py-2"
      >
        <span className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-moss">
          <Check size={22} /> Conserver
        </span>
      </motion.div>

      <motion.div
        style={{ opacity: trashOpacity }}
        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rotate-[8deg] rounded-2xl border-4 border-[#a8321f] bg-[#a8321f]/10 px-4 py-2"
      >
        <span className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-[#a8321f]">
          <Trash2 size={22} /> Inutile
        </span>
      </motion.div>

      <motion.div
        style={{ opacity: laterOpacity }}
        className="pointer-events-none absolute inset-x-0 top-10 flex justify-center"
      >
        <span className="flex items-center gap-2 rounded-2xl border-4 border-gold bg-gold/15 px-4 py-2 text-lg font-bold uppercase tracking-wide text-[#8a5a0a]">
          <Clock3 size={22} /> Plus tard
        </span>
      </motion.div>
    </motion.div>
  );
}
