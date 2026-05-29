import { SurfaceCard } from "@/components/ui/surface-card";
import {
  formatDuration,
  getHealthCategoryStyle,
  healthSourceLabels,
} from "@/lib/health-constants";
import { totalActiveMinutes } from "@/lib/build-health-calendar-events";
import type { HealthEvent } from "@/src/data/health-events";
import { cn } from "@/lib/utils";

type HealthDayPanelProps = {
  dateLabel: string;
  events: HealthEvent[];
};

export function HealthDayPanel({ dateLabel, events }: HealthDayPanelProps) {
  const minutes = totalActiveMinutes(events);

  return (
    <SurfaceCard as="aside" className="lg:col-span-2">
      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-semibold tracking-tight">{dateLabel}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {events.length === 0
            ? "Rest day — no activities planned"
            : `${events.length} activit${events.length === 1 ? "y" : "ies"}`}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
          Select a day or edit{" "}
          <code className="text-xs">recurring-health-events.ts</code> and{" "}
          <code className="text-xs">health-activities.ts</code>.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {events.map((event) => {
            const style = getHealthCategoryStyle(event.category);
            return (
              <li
                key={event.id}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className={cn("font-medium", style.text)}>
                      {event.category}
                    </span>
                    <span className="mx-1.5 text-muted-foreground/50">·</span>
                    <span className="text-xs">
                      {healthSourceLabels[event.source]}
                    </span>
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatDuration(event.durationMinutes)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > 0 && (
        <div className="border-t border-border/60 px-5 py-4 sm:px-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active time</span>
            <span className="font-semibold tabular-nums">
              {formatDuration(minutes)}
            </span>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
