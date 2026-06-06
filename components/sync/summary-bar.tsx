import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SummaryBarProps = {
  children: ReactNode;
  className?: string;
};

export function SummaryBar({ children, className }: SummaryBarProps) {
  return (
    <p
      className={cn(
        "text-[13px] tracking-[-0.01em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SummaryStat({
  children,
  highlight,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        highlight ? "text-warning" : "text-foreground/80",
      )}
    >
      {children}
    </span>
  );
}

export function SummaryDivider() {
  return (
    <span aria-hidden className="mx-2.5 text-border/80">
      ·
    </span>
  );
}
