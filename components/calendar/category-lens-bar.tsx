"use client";

import type { CalendarLens } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

const LENS_OPTIONS: { id: CalendarLens; label: string; enabled: boolean }[] = [
  { id: "all", label: "All", enabled: true },
  { id: "money", label: "Money", enabled: true },
  { id: "health", label: "Health", enabled: true },
];

type CategoryLensBarProps = {
  value: CalendarLens;
  onChange: (lens: CalendarLens) => void;
};

export function CategoryLensBar({ value, onChange }: CategoryLensBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Calendar category"
      className="flex flex-wrap gap-x-3 gap-y-1"
    >
      {LENS_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          disabled={!option.enabled}
          onClick={() => option.enabled && onChange(option.id)}
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.06em] transition-colors",
            value === option.id
              ? "text-foreground/85"
              : "text-muted-foreground/45 hover:text-muted-foreground/70",
            !option.enabled && "cursor-not-allowed opacity-40",
          )}
        >
          {option.label}
          {!option.enabled && (
            <span className="ml-1 normal-case tracking-normal opacity-70">
              Soon
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
