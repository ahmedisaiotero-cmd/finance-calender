import { FinanceContent } from "@/components/finance/finance-content";
import { AppShell } from "@/components/dashboard/app-shell";

export default function FinancePage() {
  return (
    <AppShell title="Finance" layout="finance">
      <FinanceContent />
    </AppShell>
  );
}
