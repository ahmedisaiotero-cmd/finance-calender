import type { SpendingRhythmItem } from "@/components/finance/finance-mock-data";
import { cn } from "@/lib/utils";

type FinanceSpendingRhythmProps = {
  items: SpendingRhythmItem[];
};

function stateClass(state: string): string {
  const lower = state.toLowerCase();
  if (lower.includes("elevated")) return "sync-finance-rhythm-state--elevated";
  if (lower.includes("lower")) return "sync-finance-rhythm-state--positive";
  return "";
}

export function FinanceSpendingRhythm({ items }: FinanceSpendingRhythmProps) {
  return (
    <section className="sync-home-surface sync-finance-card">
      <h2 className="sync-finance-card-title">Spending rhythm</h2>

      <ul className="mt-3.5 flex flex-col gap-2.5">
        {items.map((item) => (
          <li
            key={item.category}
            className="flex items-baseline justify-between gap-4"
          >
            <span className="text-[13px] text-foreground/85">{item.category}</span>
            <span
              className={cn(
                "text-[12px] text-muted-foreground/74",
                stateClass(item.state),
              )}
            >
              {item.state}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
