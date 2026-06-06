import { AppShell } from "@/components/dashboard/app-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export default function Home() {
  return (
    <AppShell
      title="Home"
      description={`Your life at a glance on one timeline. ${SYNC_PRODUCT.positioning}.`}
      eyebrow={SYNC_PRODUCT.name}
    >
      <DashboardContent />
    </AppShell>
  );
}
