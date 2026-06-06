import type { FinanceObligation } from "@/components/finance/finance-mock-data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type FinanceObligationsProps = {
  obligations: FinanceObligation[];
};

export function FinanceObligations({ obligations }: FinanceObligationsProps) {
  return (
    <section className="sync-home-surface sync-finance-card">
      <h2 className="sync-finance-card-title">Upcoming obligations</h2>

      <ul className="mt-3.5 flex flex-col gap-3">
        {obligations.slice(0, 3).map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-4 text-[13px]"
          >
            <span className="min-w-0 tracking-[-0.01em] text-foreground/88">
              <span className="text-muted-foreground/70">{item.dateLabel}</span>
              <span className="text-muted-foreground/40" aria-hidden>
                {" "}
                ·{" "}
              </span>
              {item.title}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground/76">
              {formatCurrency(item.amount)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
