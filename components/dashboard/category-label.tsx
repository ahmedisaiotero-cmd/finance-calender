import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

const LABELS: Record<TimelineEvent["lifeCategory"], string> = {
  money: "Money",
  health: "Health",
  family: "Family",
  goals: "Goals",
  reflection: "Reflection",
  work: "Work",
  career: "Career",
  relationships: "Relationships",
  personal: "Personal",
};

const LABEL_CLASS: Record<TimelineEvent["lifeCategory"], string> = {
  money: "text-muted-foreground/55",
  health: "text-income/70",
  family: "text-muted-foreground/50",
  goals: "text-muted-foreground/50",
  reflection: "text-muted-foreground/50",
  work: "text-muted-foreground/55",
  career: "text-muted-foreground/55",
  relationships: "text-muted-foreground/50",
  personal: "text-muted-foreground/50",
};

export function CategoryLabel({
  category,
}: {
  category: TimelineEvent["lifeCategory"];
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.06em]",
        LABEL_CLASS[category],
      )}
    >
      {LABELS[category]}
    </span>
  );
}
