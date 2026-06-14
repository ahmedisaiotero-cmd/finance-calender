import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";
import type { CorrectionEntry } from "@/lib/parser/normalize-capture-input";

function confidenceLabel(
  confidence: number,
): TimelineResolution["confidenceLabel"] {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}

export function computeNormalizationPenalty(entries: CorrectionEntry[]): number {
  if (entries.length === 0) return 0;

  let penalty = 0;
  for (const entry of entries) {
    if (entry.severity === "spacing") penalty += 0.02;
    else if (entry.severity === "typo") penalty += 0.03;
    else if (entry.severity === "fuzzy") penalty += 0.07;
    else if (entry.severity === "format") penalty += 0.02;
  }

  return Math.min(penalty, 0.12);
}

export type ParseClarity = {
  categoryClear: boolean;
  dateClear: boolean;
  timeClear: boolean;
  destinationClear: boolean;
};

export function applyNormalizationConfidencePenalty(
  timeline: TimelineResolution,
  entries: CorrectionEntry[],
  clarity: ParseClarity,
): TimelineResolution {
  const penalty = computeNormalizationPenalty(entries);
  if (penalty === 0) return timeline;

  const structurallyClear =
    clarity.categoryClear &&
    clarity.dateClear &&
    (clarity.timeClear || !timeline.isTimed) &&
    clarity.destinationClear;

  let confidence = Math.max(0, timeline.confidence - penalty);

  if (structurallyClear) {
    confidence = Math.max(confidence, 0.85);
  } else if (
    clarity.categoryClear &&
    clarity.dateClear &&
    timeline.confidence >= 0.65
  ) {
    confidence = Math.max(confidence, 0.68);
  }

  return {
    ...timeline,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    needsConfirmation:
      timeline.needsConfirmation ?? confidence < 0.85,
  };
}
