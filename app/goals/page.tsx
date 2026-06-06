import { AppShell } from "@/components/dashboard/app-shell";

export default function GoalsPage() {
  return (
    <AppShell
      title="Goals"
      description="What you are working toward — when this area is active for you."
    >
      <p className="max-w-lg text-[13px] leading-relaxed text-muted-foreground/78">
        Add a goal or enable Goals in Settings. Sync will fold momentum into
        your daily briefing without turning life into a scoreboard.
      </p>
    </AppShell>
  );
}
