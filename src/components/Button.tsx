import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-deep active:translate-y-px shadow-[0_10px_24px_-14px_rgba(224,85,43,0.9)]",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-2 active:translate-y-px",
  ghost: "bg-transparent text-ink-soft hover:bg-cream-deep/70",
  danger:
    "bg-[#a8321f] text-white hover:bg-[#8c2817] active:translate-y-px",
  success:
    "bg-moss text-white hover:bg-[#245640] active:translate-y-px",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[0.95rem] gap-2 rounded-2xl",
  lg: "h-13 px-7 text-base gap-2.5 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", block, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "disabled:opacity-45 disabled:pointer-events-none select-none",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
});
