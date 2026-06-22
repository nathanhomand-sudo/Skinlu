import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";
import { cn } from "./cn";

type SectionHeadingProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({ eyebrow, title, align = "left", className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "grid gap-[0.65rem]",
        align === "center" && "text-center justify-center",
        className,
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          "font-display text-[clamp(2rem,8vw,3.8rem)] font-[650] leading-[0.98] text-text-primary max-w-[760px]",
          align === "center" && "mx-auto",
        )}
      >
        {title}
      </h2>
    </div>
  );
}
