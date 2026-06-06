import { CategoryPill } from "@/components/sync/category-pill";
import type { SyncTimelineCategory } from "@/lib/sync-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

type Category = SyncTimelineCategory | TimelineEvent["lifeCategory"];

export type TimelineItemRowProps = {
  id: string;
  timeLabel?: string;
  dayLabel?: string;
  dateLabel?: string;
  title: string;
  meta?: string;
  category: Category;
  trailing?: React.ReactNode;
  showDivider?: boolean;
  variant?: "today" | "upcoming" | "compact";
};

export function TimelineItemRow({
  timeLabel,
  dayLabel,
  dateLabel,
  title,
  meta,
  category,
  trailing,
  showDivider,
  variant = "today",
}: TimelineItemRowProps) {
  if (variant === "upcoming") {
    return (
      <li
        className={cn(
          "grid items-baseline gap-x-4 gap-y-0.5 sm:grid-cols-[5.5rem_1fr_auto]",
          showDivider && "border-t border-border/25 pt-3.5",
        )}
      >
        <div className="flex flex-col">
          {dayLabel && (
            <span className="text-[12px] font-medium tracking-tight text-foreground/80">
              {dayLabel}
            </span>
          )}
          {dateLabel && (
            <span className="text-[11px] text-muted-foreground/55">
              {dateLabel}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] tracking-[-0.01em] text-foreground/85">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/55">
              {meta}
            </p>
          )}
        </div>
        {trailing ?? <CategoryPill category={category} />}
      </li>
    );
  }

  if (variant === "compact") {
    return (
      <li
        className={cn(
          "flex items-baseline justify-between gap-4",
          showDivider && "border-t border-border/25 pt-3.5",
        )}
      >
        <span className="text-[13px] tracking-[-0.01em] text-foreground/85">
          {title}
        </span>
        {trailing}
      </li>
    );
  }

  return (
    <li
      className={cn(
        "grid items-baseline gap-x-5 gap-y-0.5 py-3.5 sm:grid-cols-[4.5rem_1fr_auto]",
        showDivider && "border-t border-border/25",
      )}
    >
      <span className="text-[11px] tabular-nums text-muted-foreground/60">
        {timeLabel ?? "All day"}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] tracking-[-0.01em] text-foreground/85">
          {title}
        </p>
        {meta && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/55">{meta}</p>
        )}
      </div>
      {trailing ?? <CategoryPill category={category} />}
    </li>
  );
}
