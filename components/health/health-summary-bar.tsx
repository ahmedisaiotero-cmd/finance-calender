import { healthStats } from "@/components/health/health-mock-data";
import { buildHealthRhythmMessage } from "@/lib/sync-pulse";

type HealthSummaryBarProps = {
  sessions: number;
  nextHealth: string | null;
  ready: boolean;
};

export function HealthSummaryBar({
  sessions,
  nextHealth,
  ready,
}: HealthSummaryBarProps) {
  const previewSessions = healthStats.workoutsThisWeek.value;
  const rhythm = buildHealthRhythmMessage(
    ready ? sessions : previewSessions,
    ready ? nextHealth : null,
  );
  const recovery = healthStats.recovery.value;

  return (
    <p className="text-[13px] leading-relaxed tracking-[-0.01em] text-muted-foreground/75">
      {rhythm}{" "}
      <span className="text-muted-foreground/55">
        Recovery is at {recovery}%.
      </span>
    </p>
  );
}
