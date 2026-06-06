import type { SyncTimelineCategory } from "@/lib/sync-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

type Category = SyncTimelineCategory | TimelineEvent["lifeCategory"];

const LABELS: Record<string, string> = {
  money: "Money",
  health: "Health",
  career: "Career",
  personal: "Personal",
  relationships: "Relationships",
};

const LABEL_CLASS: Record<string, string> = {
  money: "text-muted-foreground/55",
  health: "text-income/70",
  career: "text-muted-foreground/55",
  personal: "text-muted-foreground/50",
  relationships: "text-muted-foreground/50",
};

export function CategoryPill({ category }: { category: Category }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.06em]",
        LABEL_CLASS[category] ?? "text-muted-foreground/55",
      )}
    >
      {LABELS[category] ?? category}
    </span>
  );
}
