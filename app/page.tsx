import { AppShell } from "@/components/dashboard/app-shell";
import { MonthlySpendingCard } from "@/components/dashboard/monthly-spending-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

export default function Home() {
  return (
    <AppShell
      title="Dashboard"
      description="A calm overview of your spending and latest activity."
      eyebrow="Good afternoon"
    >
      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <MonthlySpendingCard className="lg:col-span-2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1 lg:gap-4">
          <QuickStat
            label="Income this month"
            value="$6,500"
            hint="+8% from April"
          />
          <QuickStat
            label="Upcoming bills"
            value="3 due"
            hint="$412 within 7 days"
          />
        </div>
        <RecentTransactions className="lg:col-span-5" />
      </div>
    </AppShell>
  );
}

function QuickStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
