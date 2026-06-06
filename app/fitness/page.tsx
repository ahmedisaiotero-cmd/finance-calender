import { HealthContent } from "@/components/health/health-content";
import { AppShell } from "@/components/dashboard/app-shell";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export default function FitnessPage() {
  return (
    <AppShell
      title="Health"
      description="Am I taking care of myself? Weekly rhythm and today's basics."
      eyebrow={SYNC_PRODUCT.name}
    >
      <HealthContent />
    </AppShell>
  );
}
