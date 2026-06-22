import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "acne"
  | "sensitivity"
  | "dark-spots"
  | "aging"
  | "dullness"
  | "dehydration"
  | "pores";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "border-border-strong text-text-primary bg-transparent",
  success: "border-emerald-500/40 text-emerald-700 bg-emerald-500/10",
  warning: "border-amber-500/40 text-amber-700 bg-amber-500/10",
  danger: "border-danger/30 text-danger bg-danger/[0.06]",
  acne: "border-concern-acne/50 text-concern-acne-ink bg-concern-acne/[0.09]",
  sensitivity: "border-concern-sensitivity/40 text-concern-sensitivity-ink bg-concern-sensitivity/[0.07]",
  "dark-spots": "border-concern-dark-spots/45 text-concern-dark-spots-ink bg-concern-dark-spots/[0.09]",
  aging: "border-concern-aging/40 text-concern-aging-ink bg-concern-aging/[0.08]",
  dullness: "border-concern-dullness/40 text-concern-dullness bg-concern-dullness/[0.08]",
  dehydration: "border-concern-dehydration/40 text-concern-dehydration-ink bg-concern-dehydration/[0.08]",
  pores: "border-concern-pores/35 text-concern-pores bg-concern-pores/[0.06]",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[0.78rem] font-bold tracking-[0.01em] px-[0.68rem] py-[0.38rem]",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
