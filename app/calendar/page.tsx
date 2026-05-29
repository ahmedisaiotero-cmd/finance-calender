import { MonthCalendar } from "@/components/calendar/month-calendar";
import { AppShell } from "@/components/dashboard/app-shell";

export default function CalendarPage() {
  return (
    <AppShell
      title="Calendar"
      description="Recurring bills, logged transactions, and one-time events in one view."
      eyebrow="Plan ahead"
    >
      <MonthCalendar initialYear={2026} initialMonth={4} />
    </AppShell>
  );
}
