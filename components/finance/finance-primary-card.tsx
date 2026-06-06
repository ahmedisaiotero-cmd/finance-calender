import type { FinanceObligation } from "@/components/finance/finance-mock-data";
import type { FinanceSnapshotData } from "@/components/finance/finance-snapshot-card";
import { buildFinanceGlance } from "@/lib/sync-pulse";

type FinancePrimaryCardProps = {
  snapshot: FinanceSnapshotData;
  obligations: FinanceObligation[];
};

export function FinancePrimaryCard({
  snapshot,
  obligations,
}: FinancePrimaryCardProps) {
  const next = obligations[0] ?? null;
  const glance = buildFinanceGlance({
    cashFlowHealthy: snapshot.cashFlowStatus.toLowerCase().includes("healthy"),
    billsCovered: snapshot.availableToSpend > 0,
    nextObligation: next
      ? { title: next.title, dateLabel: next.dateLabel }
      : null,
  });

  const upcoming = obligations.slice(0, 2);

  return (
    <section className="sync-home-surface sync-finance-primary">
      <p className="text-[15px] leading-relaxed tracking-[-0.02em] text-muted-foreground/82">
        {glance}
      </p>

      {upcoming.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2.5 border-t border-border/25 pt-4">
          {upcoming.map((item) => (
            <li key={item.id} className="text-[13px] text-foreground/88">
              <span className="text-muted-foreground/68">{item.dateLabel}</span>
              <span className="text-muted-foreground/40" aria-hidden>
                {" "}
                ·{" "}
              </span>
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
