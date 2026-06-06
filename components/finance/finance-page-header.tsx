import { FinanceSourcePill } from "@/components/finance/finance-source-pill";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

type FinancePageHeaderProps = {
  institutions: string[];
  lastUpdatedMinutes: number;
  showSource?: boolean;
};

export function FinancePageHeader({
  institutions,
  lastUpdatedMinutes,
  showSource = true,
}: FinancePageHeaderProps) {
  return (
    <header className="sync-finance-header">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/62">
          {SYNC_PRODUCT.name}
        </p>
        <h1 className="mt-1.5 text-[1.75rem] font-medium tracking-[-0.035em] text-foreground/95 sm:text-[2rem]">
          Finance
        </h1>
      </div>
      {showSource && (
        <FinanceSourcePill
          institutions={institutions}
          lastUpdatedMinutes={lastUpdatedMinutes}
          className="mt-1 shrink-0"
        />
      )}
    </header>
  );
}
