import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarLens } from "@/lib/timeline-events";

type CalendarToolbarProps = {
  monthLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  variant?: "month" | "two-week";
  lens?: CalendarLens;
};

const LENS_SUBTITLE: Partial<Record<CalendarLens, string>> = {
  all: "Finance & Health",
  money: "Finance",
  health: "Health",
};

export function CalendarToolbar({
  monthLabel,
  onPrevious,
  onNext,
  onToday,
  variant = "month",
  lens,
}: CalendarToolbarProps) {
  const isTwoWeek = variant === "two-week";
  const subtitle = lens ? LENS_SUBTITLE[lens] : undefined;

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div>
        <h2 className="text-[15px] font-medium tracking-[-0.02em] text-foreground/90">
          {monthLabel}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[11px] text-muted-foreground/65">
            {isTwoWeek ? "Two-week view" : "Month view"} · {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToday}
          className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onPrevious}
          aria-label={isTwoWeek ? "Previous two weeks" : "Previous month"}
          className="text-muted-foreground/45 transition-colors hover:text-muted-foreground/75"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={isTwoWeek ? "Next two weeks" : "Next month"}
          className="text-muted-foreground/45 transition-colors hover:text-muted-foreground/75"
        >
          <ChevronRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
