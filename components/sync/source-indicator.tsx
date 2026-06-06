import { cn } from "@/lib/utils";

type SourceIndicatorProps = {
  label: string;
  className?: string;
};

/** Small, secondary label showing where card data comes from. */
export function SourceIndicator({ label, className }: SourceIndicatorProps) {
  return (
    <span
      className={cn(
        "sync-home-source shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground/58",
        className,
      )}
    >
      {label}
    </span>
  );
}
