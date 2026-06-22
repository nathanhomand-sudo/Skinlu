import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("container", className)} {...props} />;
}
