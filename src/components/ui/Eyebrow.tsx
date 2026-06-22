import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type EyebrowProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "accent" | "muted";
};

export function Eyebrow({ className, tone = "accent", ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[0.72rem] font-bold uppercase tracking-[0.12em]",
        tone === "accent" ? "text-accent" : "text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
