import { AppShell } from "@/components/dashboard/app-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function Home() {
  return (
    <AppShell
      title="Dashboard"
      description="A calm overview of your spending and latest activity."
      eyebrow="Good afternoon"
    >
      <DashboardContent />
    </AppShell>
  );
}
