export type FinanceSnapshotData = {
  availableToSpend: number;
  upcomingBillsTotal: number;
  savingsGoalsStatus: string;
  cashFlowStatus: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type FinanceSnapshotCardProps = {
  snapshot: FinanceSnapshotData;
};

export function FinanceSnapshotCard({ snapshot }: FinanceSnapshotCardProps) {
  const items = [
    {
      label: "Available to spend",
      value: formatCurrency(snapshot.availableToSpend),
    },
    {
      label: "Upcoming bills",
      value: formatCurrency(snapshot.upcomingBillsTotal),
    },
    {
      label: "Savings goals",
      value: snapshot.savingsGoalsStatus,
      positive: true,
    },
    {
      label: "Cash flow",
      value: snapshot.cashFlowStatus,
      positive: true,
    },
  ];

  return (
    <section className="sync-home-surface sync-finance-card">
      <h2 className="sync-finance-card-title">Snapshot</h2>

      <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label}>
            <p className="text-[11px] font-medium text-muted-foreground/70">
              {item.label}
            </p>
            <p
              className={
                item.positive
                  ? "mt-1 text-[14px] font-medium tracking-[-0.02em] text-foreground/90 sync-finance-value--positive"
                  : "mt-1 text-[14px] font-medium tracking-[-0.02em] text-foreground/90"
              }
            >
              {item.value}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
