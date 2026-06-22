import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-cta hover:bg-accent-hover hover:-translate-y-0.5 border border-transparent",
  secondary:
    "bg-transparent text-text-primary border-[1.5px] border-border-strong hover:border-accent hover:text-accent",
  ghost: "bg-transparent text-text-secondary border border-transparent hover:text-accent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm rounded-md",
  md: "h-[54px] px-7 text-[0.95rem] rounded-lg",
  lg: "h-16 px-8 text-base rounded-lg",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-extrabold tracking-[0.015em] transition-all duration-200 ease-out",
    "disabled:opacity-55 disabled:cursor-not-allowed active:scale-[0.98] active:duration-75",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
