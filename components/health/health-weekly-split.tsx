import { weeklyWorkoutSplit } from "@/components/health/health-mock-data";
import type { WorkoutDayStatus } from "@/components/health/health-mock-data";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<WorkoutDayStatus, string> = {
  done: "Done",
  planned: "Planned",
  rest: "Rest",
  today: "Today",
};

export function HealthWeeklySplit() {
  return (
    <section className="sync-home-surface sync-health-card sync-health-weekly">
      <header className="sync-health-card-head">
        <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
          Weekly rhythm
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground/72">
          Movement and recovery across the week
        </p>
      </header>

      <ul className="flex flex-col">
        {weeklyWorkoutSplit.map((day, index) => (
          <li
            key={day.id}
            className={cn(
              "sync-health-week-row",
              index > 0 && "border-t border-border/25",
              day.status === "today" && "sync-health-week-row--today",
              day.status === "done" && "sync-health-week-row--done",
              day.status === "rest" && "sync-health-week-row--rest",
            )}
          >
            <span
              className={cn(
                "sync-health-week-short",
                day.status === "today"
                  ? "text-foreground/90"
                  : "text-muted-foreground/68",
              )}
            >
              {day.short}
            </span>

            <div className="min-w-0">
              <p
                className={cn(
                  "text-[13px] tracking-[-0.01em]",
                  day.status === "today"
                    ? "font-medium text-foreground/92"
                    : "text-foreground/85",
                )}
              >
                {day.workout}
              </p>
              {day.detail && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/68">
                  {day.detail}
                </p>
              )}
            </div>

            <span
              className={cn(
                "sync-health-week-status",
                day.status === "done" && "sync-health-week-status--done",
                day.status === "today" && "sync-health-week-status--today",
              )}
            >
              {STATUS_LABEL[day.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
