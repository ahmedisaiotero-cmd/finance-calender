import { FinanceCalendarContent } from "@/components/finance/finance-calendar-content";
import { AppShell } from "@/components/dashboard/app-shell";

export default function CalendarPage() {
  return (
    <AppShell
      title="Finance Calendar"
      description="Calendar, transactions, and budgets — all synced in one place."
      eyebrow="Plan ahead"
    >
      <FinanceCalendarContent initialYear={2026} initialMonth={4} />
    </AppShell>
  );
}
