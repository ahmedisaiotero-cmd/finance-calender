import { recentWorkouts } from "@/components/health/health-mock-data";
import { SectionEyebrow } from "@/components/sync";

export function HealthRecentActivity() {
  return (
    <section>
      <SectionEyebrow title="Recent" />

      <ul className="flex flex-col gap-3.5">
        {recentWorkouts.map((workout) => (
          <li key={workout.id}>
            <p className="text-[12px] tracking-[-0.01em] text-foreground/75">
              {workout.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/55">
              {workout.when} · {workout.duration}
              {workout.calories != null && ` · ${workout.calories} kcal`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
