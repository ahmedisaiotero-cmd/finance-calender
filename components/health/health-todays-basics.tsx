import type { HealthBasics } from "@/components/health/health-mock-data";

type HealthTodaysBasicsProps = {
  basics: HealthBasics;
};

export function HealthTodaysBasics({ basics }: HealthTodaysBasicsProps) {
  const { sleep, movement, recovery } = basics;

  const rows = [
    { label: "Sleep", note: sleep.insight },
    { label: "Movement", note: movement.workoutLabel },
    { label: "Recovery", note: recovery.state },
  ];

  return (
    <section className="sync-home-surface">
      <ul className="flex flex-col gap-3.5">
        {rows.map((row) => (
          <li key={row.label} className="text-[13px]">
            <p className="font-medium tracking-[-0.01em] text-foreground/88">
              {row.label}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground/78">
              {row.note}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
