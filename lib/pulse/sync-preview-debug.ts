import type { SyncDestination } from "@/lib/captured-items";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulsePlan } from "@/lib/pulse/types";
import type { SyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { getDestinationChipLabels } from "@/lib/pulse/sync-preview-view-model";

const TIMELINE_LABEL_BLOCKLIST = new Set([
  "Today",
  "Tomorrow",
  "Upcoming",
  "Needs a timeline",
  "Next week",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isInvalidDestinationChip(chip: string): boolean {
  if (TIMELINE_LABEL_BLOCKLIST.has(chip)) return true;
  if (/^next\s+/i.test(chip)) return true;
  if (ISO_DATE_PATTERN.test(chip)) return true;
  return false;
}

export function warnInvalidDestinationChips(chips: string[]) {
  if (process.env.NODE_ENV === "production") return;

  for (const chip of chips) {
    if (isInvalidDestinationChip(chip)) {
      console.warn("Invalid destination chip detected", chip);
    }
  }
}

export function logSyncPreviewDebug(
  plan: PulsePlan,
  preview: SyncPreviewViewModel,
  selectedDestinations: SyncDestination[] = [],
) {
  if (process.env.NODE_ENV === "production") return;

  const resolvedDestinations = resolveSyncDestinations(plan);
  const renderedDestinationChips = getDestinationChipLabels(preview);

  console.debug("[SyncPreview]", {
    rawPlanDestinations: selectedDestinations,
    resolvedDestinations,
    previewDestinations: preview.where.destinations,
    renderedDestinationChips,
    whenLabel: preview.when.label,
    timelineLabel: plan.timeline?.label,
    dateLabel: plan.dateLabel,
  });

  warnInvalidDestinationChips(renderedDestinationChips);
}
