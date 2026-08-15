import { SettingsConnections } from "@/components/settings/settings-connections";
import { SettingsSignOut } from "@/components/settings/settings-sign-out";

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <SettingsConnections />
      <SettingsSignOut />
    </div>
  );
}
