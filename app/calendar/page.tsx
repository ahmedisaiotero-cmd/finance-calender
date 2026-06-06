import { FinanceCalendarContent } from "@/components/finance/finance-calendar-content";
import { AppShell } from "@/components/dashboard/app-shell";
import { SYNC_CALENDAR_ALL_HINT, SYNC_PRODUCT } from "@/lib/sync-copy";

export default function CalendarPage() {
  return (
    <AppShell
      title="Calendar"
      description={`When are the important moments? ${SYNC_CALENDAR_ALL_HINT} Tap a day for details.`}
      eyebrow={SYNC_PRODUCT.name}
      layout="wide"
    >
      <FinanceCalendarContent />
    </AppShell>
  );
}
