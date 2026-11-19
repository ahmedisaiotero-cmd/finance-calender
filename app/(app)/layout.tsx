import { PersistentAppShell } from "@/components/dashboard/persistent-app-shell";
import { ConsumerFirstRunGate } from "@/components/settings/consumer-first-run-gate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PersistentAppShell>
      <ConsumerFirstRunGate />
      {children}
    </PersistentAppShell>
  );
}
