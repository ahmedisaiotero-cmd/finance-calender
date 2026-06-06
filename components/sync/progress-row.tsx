import { cn } from "@/lib/utils";

type ProgressRowProps = {
  label: string;
  valueLabel: string;
  limitLabel?: string;
  percent: number;
  needsAttention?: boolean;
  note?: string;
};

export function ProgressRow({
  label,
  valueLabel,
  limitLabel,
  percent,
  needsAttention = false,
  note,
}: ProgressRowProps) {
  const fillWidth = needsAttention ? 100 : percent;

  return (
    <li>
      <p className="mb-2 text-[12px] text-foreground/80">{label}</p>
      <div className="flex items-center gap-3">
        <div
          className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-border/50"
          aria-hidden
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              needsAttention ? "bg-muted-foreground/35" : "bg-income/60",
            )}
            style={{ width: `${fillWidth}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
          {valueLabel}
          {limitLabel && (
            <span className="text-muted-foreground/45"> / {limitLabel}</span>
          )}
        </span>
      </div>
      {note && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/55">
          {note}
        </p>
      )}
    </li>
  );
}
