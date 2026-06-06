import { todayHealthTrackers } from "@/components/health/health-mock-data";
import { SectionEyebrow } from "@/components/sync";

function progressPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export function HealthTodayTracker() {
  return (
    <section>
      <SectionEyebrow title="Today" />

      <ul className="flex flex-col gap-4">
        {todayHealthTrackers.map((item) => {
          const pct = progressPercent(item.current, item.target);
          return (
            <li key={item.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-muted-foreground/75">
                  {item.label}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground/60">
                  {item.current}
                  <span className="text-muted-foreground/45">
                    {" "}
                    / {item.target} {item.unit}
                  </span>
                </span>
              </div>
              <div
                className="h-px overflow-hidden rounded-full bg-border/50"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-income/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
