import { SettingsAccount } from "@/components/settings/settings-account";
import { SettingsConnections } from "@/components/settings/settings-connections";
import { SettingsDevices } from "@/components/settings/settings-devices";
import { SettingsLlmConsent } from "@/components/settings/settings-llm-consent";
import { SettingsSignOut } from "@/components/settings/settings-sign-out";

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <SettingsAccount />
      <SettingsLlmConsent />
      <SettingsDevices />
      <SettingsConnections />
      <SettingsSignOut />
    </div>
  );
}
