import { AppShell } from "@/components/dashboard/app-shell";

export default function WorkPage() {
  return (
    <AppShell
      title="Work"
      description="Signals from your work tools — when this area is active for you."
    >
      <p className="max-w-lg text-[13px] leading-relaxed text-muted-foreground/78">
        Connect a work calendar or project tool in Settings. Sync will read
        what matters and surface calm guidance here.
      </p>
    </AppShell>
  );
}
