import { sourceViaLabel } from "@/lib/sync-copy";
import { cn } from "@/lib/utils";

type FinanceSourcePillProps = {
  institutions: string[];
  lastUpdatedMinutes?: number;
  className?: string;
};

export function FinanceSourcePill({
  institutions,
  className,
}: FinanceSourcePillProps) {
  const label = institutions.slice(0, 2).join(" · ");

  return (
    <span
      className={cn(
        "sync-finance-source-pill shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground/58",
        className,
      )}
    >
      {sourceViaLabel(label)}
    </span>
  );
}
