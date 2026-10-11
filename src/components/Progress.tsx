import { cn } from "@/lib/cn";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  tone?: "accent" | "moss";
}

export function Progress({ value, max = 100, className, label, tone = "accent" }: ProgressProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const percent = Math.round(ratio * 100);
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label ?? "Progression"}
        className="h-2.5 w-full overflow-hidden rounded-full bg-cream-deep"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            tone === "accent"
              ? "bg-gradient-to-r from-accent to-[#ef7a4f]"
              : "bg-gradient-to-r from-moss to-[#4f9d78]",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
