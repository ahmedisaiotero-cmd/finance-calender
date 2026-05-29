import { CalendarDayCell } from "@/components/calendar/calendar-day-cell";
import { CALENDAR_WEEKDAYS } from "@/lib/calendar-constants";
import type { CalendarCell } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/src/data/calendar-events";

type CalendarGridProps = {
  cells: CalendarCell[];
  eventsByDate: Map<string, CalendarEvent[]>;
  selectedKey: string;
  onSelectDay: (dateKey: string) => void;
};

export function CalendarGrid({
  cells,
  eventsByDate,
  selectedKey,
  onSelectDay,
}: CalendarGridProps) {
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
          <CalendarDayCell
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
