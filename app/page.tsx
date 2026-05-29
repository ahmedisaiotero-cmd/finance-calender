import { MobileHeader } from "@/components/dashboard/mobile-header";
import { MonthlySpendingCard } from "@/components/dashboard/monthly-spending-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
            <header className="mb-8 hidden md:block">
              <p className="text-sm font-medium text-muted-foreground">
                Good afternoon
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                Dashboard
              </h1>
              <p className="mt-2 max-w-lg text-muted-foreground">
                A calm overview of your spending and latest activity.
              </p>
            </header>

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
          </div>
        </main>
      </div>
    </div>
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
