import { AppShell } from "@/components/dashboard/app-shell";
import { MoneyContent } from "@/components/money/money-content";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export default function MoneyPage() {
  return (
    <AppShell
      title="Money"
      description="Am I financially on track? Snapshot, budgets, and what's ahead."
      eyebrow={SYNC_PRODUCT.name}
    >
      <MoneyContent />
    </AppShell>
  );
}
