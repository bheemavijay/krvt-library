import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-border bg-panel p-6 shadow-[var(--shadow-soft)] backdrop-blur transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out",
        className,
      )}
      {...props}
    />
  );
}
