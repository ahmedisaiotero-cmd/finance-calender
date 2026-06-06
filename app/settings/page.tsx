import { AppShell } from "@/components/dashboard/app-shell";
import { SettingsComingSoon } from "@/components/settings/settings-coming-soon";
import { SettingsConnections } from "@/components/settings/settings-connections";

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Manage how Sync connects to the tools you already use."
    >
      <div className="flex max-w-2xl flex-col gap-10">
        <SettingsConnections />
        <SettingsComingSoon />
      </div>
    </AppShell>
  );
}
