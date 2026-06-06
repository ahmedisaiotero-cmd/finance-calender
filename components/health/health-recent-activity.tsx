import { recentWorkouts } from "@/components/health/health-mock-data";

export function HealthRecentActivity() {
  return (
    <section className="sync-home-surface sync-health-card">
      <header className="sync-health-card-head">
        <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
          Recent activity
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground/72">
          Last three workouts from your connected account
        </p>
      </header>

      <ul className="divide-y divide-border/25">
        {recentWorkouts.slice(0, 3).map((workout) => (
          <li key={workout.id} className="py-3.5 first:pt-0 last:pb-0">
            <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground/88">
              {workout.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/68">
              {workout.when} · {workout.duration}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
