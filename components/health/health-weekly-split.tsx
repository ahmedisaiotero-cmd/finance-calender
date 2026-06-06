import { weeklyWorkoutSplit } from "@/components/health/health-mock-data";
import type { WorkoutDayStatus } from "@/components/health/health-mock-data";
import { SectionPanel } from "@/components/sync/section-panel";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<WorkoutDayStatus, string> = {
  done: "Done",
  planned: "Planned",
  rest: "Rest",
  today: "Today",
};

const STATUS_CLASS: Record<WorkoutDayStatus, string> = {
  done: "text-income/75",
  today: "text-foreground/90",
  planned: "text-muted-foreground/60",
  rest: "text-muted-foreground/50",
};

export function HealthWeeklySplit() {
  return (
    <SectionPanel title="Weekly Workout Split">
      <ul className="flex flex-col">
        {weeklyWorkoutSplit.map((day, index) => (
          <li
            key={day.id}
            className={cn(
              "grid items-baseline gap-x-5 gap-y-0.5 py-4 sm:grid-cols-[2.75rem_1fr_auto]",
              index > 0 && "border-t border-border/25",
              day.status === "today" &&
                "bg-primary/[0.03] -mx-5 px-5 sm:-mx-7 sm:px-7",
            )}
          >
            <span
              className={cn(
                "text-[12px] font-medium tabular-nums tracking-tight",
                day.status === "today"
                  ? "text-foreground"
                  : "text-muted-foreground/70",
              )}
            >
              {day.short}
            </span>

            <div className="min-w-0">
              <p
                className={cn(
                  "text-[13px] tracking-[-0.01em]",
                  day.status === "today"
                    ? "font-medium text-foreground"
                    : "text-foreground/85",
                )}
              >
                {day.workout}
              </p>
              {day.detail && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/65">
                  {day.detail}
                </p>
              )}
            </div>

            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-[0.06em] sm:text-right",
                STATUS_CLASS[day.status],
              )}
            >
              {STATUS_LABEL[day.status]}
            </span>
          </li>
        ))}
      </ul>
    </SectionPanel>
  );
}
