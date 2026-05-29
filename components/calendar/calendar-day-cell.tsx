import type { CalendarEvent } from "@/src/data/calendar-events";
import type { CalendarCell } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

type CalendarDayCellProps = {
  cell: CalendarCell;
  events: CalendarEvent[];
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
};

export function CalendarDayCell({
  cell,
  events,
  isSelected,
  onSelect,
}: CalendarDayCellProps) {
  const hasIncome = events.some((e) => e.amount >= 0);
  const hasExpense = events.some((e) => e.amount < 0);

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
        {events.slice(0, 2).map((event) => (
          <span
            key={event.id}
            className={cn(
              "truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]",
              event.amount >= 0
                ? "bg-income-muted text-income"
                : "bg-expense-muted text-expense",
            )}
          >
            {event.title}
          </span>
        ))}
        {events.length > 2 && (
          <span className="px-1 text-[10px] text-muted-foreground">
            +{events.length - 2} more
          </span>
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-auto flex gap-0.5 pt-1">
          {hasIncome && <span className="size-1.5 rounded-full bg-income" />}
          {hasExpense && (
            <span className="size-1.5 rounded-full bg-expense opacity-60" />
          )}
        </div>
      )}
    </button>
  );
}
