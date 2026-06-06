import { HealthMonthCalendar } from "@/components/health/health-month-calendar";
import { AppShell } from "@/components/dashboard/app-shell";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export default function FitnessPage() {
  return (
    <AppShell
      title="Health"
      description="Training, recovery, and wellness on your SYNC timeline."
      eyebrow={SYNC_PRODUCT.name}
    >
      <HealthMonthCalendar initialYear={2026} initialMonth={4} />
    </AppShell>
  );
}
