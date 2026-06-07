import { SettingsComingSoon } from "@/components/settings/settings-coming-soon";
import { SettingsConnections } from "@/components/settings/settings-connections";

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <SettingsConnections />
      <SettingsComingSoon />
    </div>
  );
}
