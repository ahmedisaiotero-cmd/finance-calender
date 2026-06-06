"use client";

import { cn } from "@/lib/utils";

export type MoneySegment = "overview" | "transactions" | "budgets";

const SEGMENTS: { id: MoneySegment; label: string; hash?: string }[] = [
  { id: "overview", label: "Calendar" },
  { id: "transactions", label: "Transactions", hash: "transactions" },
  { id: "budgets", label: "Budgets", hash: "budgets" },
];

type CalendarSegmentTabsProps = {
  value: MoneySegment;
  onChange: (segment: MoneySegment) => void;
};

export function CalendarSegmentTabs({
  value,
  onChange,
}: CalendarSegmentTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Money views"
      className="inline-flex rounded-full border border-border/60 bg-muted/40 p-0.5"
    >
      {SEGMENTS.map((segment) => (
        <button
          key={segment.id}
          type="button"
          role="tab"
          aria-selected={value === segment.id}
          onClick={() => {
            onChange(segment.id);
            if (segment.hash) {
              window.history.replaceState(null, "", `#${segment.hash}`);
            } else {
              const path = window.location.pathname + window.location.search;
              window.history.replaceState(null, "", path);
            }
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
            value === segment.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}

export function moneySegmentFromHash(hash: string): MoneySegment {
  if (hash === "#transactions") return "transactions";
  if (hash === "#budgets") return "budgets";
  return "overview";
}
