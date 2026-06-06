import { dayCategoryDots, type DayCategoryDot } from "@/lib/calendar-display-events";
import type { TimelineEvent } from "@/lib/timeline-events";
import type { CalendarCell } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

type CalendarDayCellProps = {
  cell: CalendarCell;
  events: TimelineEvent[];
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
  density?: "month" | "two-week";
};

function dotClass(dot: DayCategoryDot) {
  if (dot === "health") return "sync-apple-cal-dot--health";
  if (dot === "money-income") return "sync-apple-cal-dot--money-income";
  return "sync-apple-cal-dot--money";
}

/** Month grid: day number, category dots, item count only — no event names. */
export function CalendarDayCell({
  cell,
  events,
  isSelected,
  onSelect,
  density = "month",
}: CalendarDayCellProps) {
  if (density !== "month") {
    return null;
  }

  const dots = dayCategoryDots(events);
  const count = events.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dateKey)}
      aria-pressed={isSelected}
      aria-label={`${cell.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}${count > 0 ? `, ${count} items` : ""}`}
      className={cn(
        "sync-apple-cal-cell flex flex-col items-start p-3 text-left transition-colors sm:p-3.5",
        "min-h-[4.75rem] sm:min-h-[5.25rem] lg:min-h-[5.75rem]",
        !cell.isCurrentMonth && "opacity-40",
        isSelected && "sync-apple-cal-cell--selected",
        !isSelected && "hover:bg-muted/15",
      )}
    >
      <span
        className={cn(
          "mb-auto flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-medium tabular-nums",
          cell.isToday &&
            "bg-[#ff3b30] text-white shadow-[0_1px_4px_rgba(255,59,48,0.35)]",
          !cell.isToday && "text-foreground/88",
        )}
      >
        {cell.date.getDate()}
      </span>

      {count > 0 && (
        <div className="mt-auto flex w-full flex-col gap-1.5">
          {dots.length > 0 && (
            <div className="flex gap-1" aria-hidden>
              {dots.slice(0, 3).map((dot, index) => (
                <span
                  key={`${cell.dateKey}-${dot}-${index}`}
                  className={cn("sync-apple-cal-dot", dotClass(dot))}
                />
              ))}
            </div>
          )}
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground/60">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </div>
      )}
    </button>
  );
}
