import { HealthMonthCalendar } from "@/components/health/health-month-calendar";
import { AppShell } from "@/components/dashboard/app-shell";

export default function FitnessPage() {
  return (
    <AppShell
      title="Health & Fitness"
      description="Plan workouts, log activity, and track wellness on your calendar."
      eyebrow="Move daily"
    >
      <HealthMonthCalendar initialYear={2026} initialMonth={4} />
    </AppShell>
  );
}
