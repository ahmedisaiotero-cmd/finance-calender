import type { HealthEvent } from "@/src/data/health-events";
import type { CalendarCell } from "@/lib/calendar-utils";
import { getHealthCategoryStyle } from "@/lib/health-constants";
import { cn } from "@/lib/utils";

type HealthDayCellProps = {
  cell: CalendarCell;
  events: HealthEvent[];
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
};

export function HealthDayCell({
  cell,
  events,
  isSelected,
  onSelect,
}: HealthDayCellProps) {
  const categories = [...new Set(events.map((e) => e.category))];

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dateKey)}
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center rounded-2xl border border-transparent p-1.5 text-left transition-colors sm:min-h-[5.25rem] sm:p-2",
        cell.isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
        isSelected && "border-border bg-accent shadow-sm",
        !isSelected && "hover:bg-muted/50",
        cell.isToday && !isSelected && "ring-1 ring-border",
      )}
    >
      <span
        className={cn(
          "mb-1 flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
          cell.isToday && "bg-primary text-primary-foreground",
        )}
      >
        {cell.date.getDate()}
      </span>

      <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden">
        {events.slice(0, 2).map((event) => {
          const style = getHealthCategoryStyle(event.category);
          return (
            <span
              key={event.id}
              className={cn(
                "truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]",
                style.bg,
                style.text,
              )}
            >
              {event.title}
            </span>
          );
        })}
        {events.length > 2 && (
          <span className="px-1 text-[10px] text-muted-foreground">
            +{events.length - 2} more
          </span>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-auto flex gap-0.5 pt-1">
          {categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className={cn(
                "size-1.5 rounded-full",
                getHealthCategoryStyle(category).dot,
              )}
            />
          ))}
        </div>
      )}
    </button>
  );
}
