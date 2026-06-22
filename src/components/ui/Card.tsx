import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "surface" | "surface-hi" | "accent";
  elevated?: boolean;
};

const VARIANT_CLASSES: Record<NonNullable<CardProps["variant"]>, string> = {
  surface: "bg-surface bg-gradient-to-b from-white/[0.04] to-white/[0.01] border-border/70",
  "surface-hi": "bg-surface-hi bg-gradient-to-b from-white/[0.05] to-white/[0.01] border-border/60",
  accent: "bg-gradient-to-br from-accent/[0.07] to-accent/[0.02] border-accent/20",
};

export function Card({ variant = "surface", elevated = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-6 shadow-soft transition-shadow duration-200",
        VARIANT_CLASSES[variant],
        elevated && "shadow-elevated",
        className,
      )}
      {...props}
    />
  );
}
