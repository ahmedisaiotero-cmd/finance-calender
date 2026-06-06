"use client";

import type { CalendarLens } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

const LENS_OPTIONS: { id: CalendarLens; label: string; enabled: boolean }[] = [
  { id: "all", label: "All", enabled: true },
  { id: "money", label: "Money", enabled: true },
  { id: "health", label: "Health", enabled: true },
  { id: "career", label: "Career", enabled: false },
  { id: "relationships", label: "Relationships", enabled: false },
  { id: "personal", label: "Personal", enabled: false },
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
      className="flex flex-wrap gap-1.5"
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
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
            value === option.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted",
            !option.enabled &&
              "cursor-not-allowed opacity-45 hover:bg-muted/60",
          )}
        >
          {option.label}
          {!option.enabled && (
            <span className="ml-1 text-[10px] uppercase opacity-80">Soon</span>
          )}
        </button>
      ))}
    </div>
  );
}
