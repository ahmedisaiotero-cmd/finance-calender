import { AppShell } from "@/components/dashboard/app-shell";
import { TransactionsContent } from "@/components/transactions/transactions-content";
import { recentTransactions } from "@/src/data/transactions";

export default function TransactionsPage() {
  return (
    <AppShell
      title="Transactions"
      description="Review income and spending across all your accounts."
      eyebrow="Activity"
    >
      <TransactionsContent transactions={recentTransactions} />
    </AppShell>
  );
}
