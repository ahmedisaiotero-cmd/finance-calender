import type { HealthEventSource } from "@/src/data/health-events";
import { healthSourceLabels } from "@/lib/health-constants";

export function HealthSourceLegend() {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
      {(Object.entries(healthSourceLabels) as [HealthEventSource, string][]).map(
        ([key, label]) => (
          <span
            key={key}
            className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1"
          >
            {label}
            {key === "recurring" && " · weekly"}
          </span>
        ),
      )}
    </div>
  );
}
