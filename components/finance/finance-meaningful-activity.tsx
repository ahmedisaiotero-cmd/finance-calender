import type { MeaningfulActivityItem } from "@/components/finance/finance-mock-data";

type FinanceMeaningfulActivityProps = {
  items: MeaningfulActivityItem[];
};

export function FinanceMeaningfulActivity({
  items,
}: FinanceMeaningfulActivityProps) {
  return (
    <section className="sync-finance-recent" aria-label="Recent meaningful activity">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/58">
        Recent meaningful activity
      </p>
      <ul className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
        {items.slice(0, 3).map((item) => (
          <li
            key={item.id}
            className="text-[12px] text-muted-foreground/72"
          >
            {item.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
