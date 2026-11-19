import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-border/45 bg-background px-3.5 text-[15px] tracking-[-0.01em] text-foreground outline-none transition-colors",
        "placeholder:text-muted-foreground/55",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
