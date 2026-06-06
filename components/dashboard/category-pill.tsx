import type { TimelineEvent } from "@/lib/timeline-events";

const LABELS: Record<TimelineEvent["lifeCategory"], string> = {
  money: "Money",
  health: "Health",
  career: "Career",
  relationships: "Relationships",
  personal: "Personal",
};

export function CategoryPill({
  category,
}: {
  category: TimelineEvent["lifeCategory"];
}) {
  return (
    <span className={`sync-dash-pill sync-dash-pill--${category}`}>
      {LABELS[category]}
    </span>
  );
}
