import type { Photo } from "@/types";
import { CATEGORY_META } from "@/types";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

export function CategoryBadge({
  category,
  confidence,
  className,
  showLabel = true,
}: {
  category: Photo["category"];
  confidence?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = CATEGORY_META[category];
  const uncertain = typeof confidence === "number" && confidence < 0.5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink-soft backdrop-blur",
        className,
      )}
      title={
        typeof confidence === "number"
          ? `Confiance ${Math.round(confidence * 100)} %${uncertain ? " — suggestion incertaine" : ""}`
          : meta.label
      }
    >
      <Icon name={meta.icon} size={13} style={{ color: meta.color }} aria-hidden />
      {showLabel ? <span>{meta.label}</span> : null}
      {typeof confidence === "number" ? (
        <span className={cn("tabular-nums", uncertain ? "text-gold" : "text-faint")}>
          {Math.round(confidence * 100)}%
        </span>
      ) : null}
    </span>
  );
}
