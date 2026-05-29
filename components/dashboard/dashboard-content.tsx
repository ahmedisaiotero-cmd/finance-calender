import { QuickStatCard } from "@/components/dashboard/quick-stat-card";
import { MonthlySpendingCard } from "@/components/dashboard/monthly-spending-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { dashboardQuickStats } from "@/lib/mock-data";

export function DashboardContent() {
  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      <MonthlySpendingCard className="lg:col-span-2" />

      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1 lg:gap-4">
        {dashboardQuickStats.map((stat) => (
          <QuickStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <RecentTransactions className="lg:col-span-5" />
    </div>
  );
}
