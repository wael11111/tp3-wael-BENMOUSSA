import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padded?: boolean;
}

export function Card({ className, children, interactive, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "card-surface",
        padded && "p-6",
        interactive &&
          "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
