import { AppShell } from "@/components/dashboard/app-shell";

export default function SchoolPage() {
  return (
    <AppShell
      title="School"
      description="Signals from your academic tools — when this area is active for you."
    >
      <p className="max-w-lg text-[13px] leading-relaxed text-muted-foreground/78">
        Connect a school calendar or learning app in Settings. Sync will bring
        only the moments that matter into your timeline.
      </p>
    </AppShell>
  );
}
