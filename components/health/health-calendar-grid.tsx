import { HealthDayCell } from "@/components/health/health-day-cell";
import { CALENDAR_WEEKDAYS } from "@/lib/calendar-constants";
import type { CalendarCell } from "@/lib/calendar-utils";
import type { HealthEvent } from "@/src/data/health-events";

type HealthCalendarGridProps = {
  cells: CalendarCell[];
  eventsByDate: Map<string, HealthEvent[]>;
  selectedKey: string;
  onSelectDay: (dateKey: string) => void;
};

export function HealthCalendarGrid({
  cells,
  eventsByDate,
  selectedKey,
  onSelectDay,
}: HealthCalendarGridProps) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {CALENDAR_WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <HealthDayCell
            key={cell.dateKey}
            cell={cell}
            events={eventsByDate.get(cell.dateKey) ?? []}
            isSelected={cell.dateKey === selectedKey}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </>
  );
}
