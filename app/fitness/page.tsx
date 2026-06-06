import { HealthContent } from "@/components/health/health-content";
import { AppShell } from "@/components/dashboard/app-shell";

export default function FitnessPage() {
  return (
    <AppShell title="Health" layout="health">
      <HealthContent />
    </AppShell>
  );
}
