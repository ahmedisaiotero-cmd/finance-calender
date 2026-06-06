import { FinanceCalendarContent } from "@/components/finance/finance-calendar-content";
import { AppShell } from "@/components/dashboard/app-shell";

export default function CalendarPage() {
  return (
    <AppShell title="Calendar" layout="calendar">
      <FinanceCalendarContent />
    </AppShell>
  );
}
