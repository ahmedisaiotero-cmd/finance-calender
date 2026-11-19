import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  message,
  action,
  className,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border/40 px-5 py-6",
        className,
      )}
    >
      {title ? (
        <p className="text-[15px] font-medium tracking-[-0.02em] text-foreground/88">
          {title}
        </p>
      ) : null}
      <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
        {message}
      </p>
      {action}
    </div>
  );
}
