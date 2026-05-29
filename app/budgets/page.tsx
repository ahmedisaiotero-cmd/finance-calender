import { AppShell } from "@/components/dashboard/app-shell";
import { BudgetsContent } from "@/components/budgets/budgets-content";

export default function BudgetsPage() {
  return (
    <AppShell
      title="Budgets"
      description="Track spending limits by category against your transactions."
      eyebrow="Stay on track"
    >
      <BudgetsContent />
    </AppShell>
  );
}
