import { SettingsAccount } from "@/components/settings/settings-account";
import { SettingsConnections } from "@/components/settings/settings-connections";
import { SettingsDevices } from "@/components/settings/settings-devices";
import { SettingsSignOut } from "@/components/settings/settings-sign-out";

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <SettingsAccount />
      <SettingsDevices />
      <SettingsConnections />
      <SettingsSignOut />
    </div>
  );
}
