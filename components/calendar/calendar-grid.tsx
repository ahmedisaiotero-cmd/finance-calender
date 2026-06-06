import { CalendarDayCell } from "@/components/calendar/calendar-day-cell";
import { CALENDAR_WEEKDAYS_SHORT } from "@/lib/calendar-constants";
import type { CalendarCell } from "@/lib/calendar-utils";
import type { TimelineEvent } from "@/lib/timeline-events";

type CalendarGridProps = {
  cells: CalendarCell[];
  eventsByDate: Map<string, TimelineEvent[]>;
  selectedKey: string;
  onSelectDay: (dateKey: string) => void;
};

export function CalendarGrid({
  cells,
  eventsByDate,
  selectedKey,
  onSelectDay,
}: CalendarGridProps) {
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="sync-apple-cal" data-calendar-mode="scan">
      <div className="sync-apple-cal-weekdays">
        {CALENDAR_WEEKDAYS_SHORT.map((day, index) => (
          <div key={`${day}-${index}`} className="sync-apple-cal-weekday">
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="sync-apple-cal-week">
          {week.map((cell) => (
            <CalendarDayCell
              key={cell.dateKey}
              cell={cell}
              events={eventsByDate.get(cell.dateKey) ?? []}
              isSelected={cell.dateKey === selectedKey}
              onSelect={onSelectDay}
              density="month"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
