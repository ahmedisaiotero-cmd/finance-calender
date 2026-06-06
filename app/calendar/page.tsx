import { FinanceCalendarContent } from "@/components/finance/finance-calendar-content";
import { AppShell } from "@/components/dashboard/app-shell";
import { SYNC_CALENDAR_ALL_HINT, SYNC_PRODUCT } from "@/lib/sync-copy";

export default function CalendarPage() {
  return (
    <AppShell
      title="Calendar"
      description={SYNC_CALENDAR_ALL_HINT}
      eyebrow={SYNC_PRODUCT.name}
    >
      <FinanceCalendarContent initialYear={2026} initialMonth={4} />
    </AppShell>
  );
}
