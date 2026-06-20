import { applyNormalizationConfidencePenalty } from "@/lib/parser/normalization-confidence";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { detectPulseCategory } from "@/lib/pulse/detect-pulse-category";
import { parsePulsePrompt } from "@/lib/pulse/parse-pulse-prompt";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import {
  buildPulseTemplate,
  materializeSections,
} from "@/lib/pulse/templates";
import {
  resolveTimeline,
  type ResolveTimelineOptions,
} from "@/lib/timeline/resolve-timeline";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";
import type { PulsePlan } from "@/lib/pulse/types";

export { detectPulseCategory } from "@/lib/pulse/detect-pulse-category";
export { parsePulsePrompt } from "@/lib/pulse/parse-pulse-prompt";

function createPlanId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pulse-${Date.now()}`;
}

type CreatePulsePlanOptions = {
  timeline?: ResolveTimelineOptions;
  categoryHint?: CaptureCategoryHint;
};

function hasResolvedTimelineLabel(timelineLabel: string) {
  return timelineLabel !== "Needs a timeline";
}

export function createPulsePlan(
  prompt: string,
  options: CreatePulsePlanOptions = {},
): PulsePlan {
  const trimmed = prompt.trim();
  const normalizedInput = normalizeCaptureInput(trimmed);
  const parserText = normalizedInput.normalized;
  const category = detectPulseCategory(parserText, options.categoryHint);
  const parsed = parsePulsePrompt(parserText, category);
  const rawTimeline = resolveTimeline(parserText, options.timeline);
  const destinations = resolveSyncDestinations(
    {
      id: "draft",
      title: "",
      category,
      status: "draft",
      prompt: parserText,
      summary: "",
      dateLabel: parsed.dateLabel ?? "Upcoming",
      timeLabel: parsed.timeLabel ?? "Flexible",
      durationMinutes: 0,
      sections: [],
      timeline: rawTimeline,
      createdAt: new Date().toISOString(),
    },
    options.categoryHint,
  );
  const timeline = applyNormalizationConfidencePenalty(
    rawTimeline,
    normalizedInput.correctionEntries,
    {
      categoryClear: category !== "general",
      dateClear: Boolean(
        rawTimeline.startDate ||
          rawTimeline.deadlineDate ||
          rawTimeline.recurrence?.days?.length ||
          (rawTimeline.label && rawTimeline.label !== "Needs a timeline"),
      ),
      timeClear: Boolean(
        rawTimeline.isTimed &&
          (rawTimeline.startTime || rawTimeline.deadlineTime),
      ),
      destinationClear: destinations.length > 0,
    },
  );
  const template = buildPulseTemplate(category, parserText, parsed);
  const id = createPlanId();

  const dateLabel = hasResolvedTimelineLabel(timeline.label)
    ? timeline.label
    : parsed.dateLabel ?? "Upcoming";
  const timeLabel = parsed.timeLabel ?? "Flexible";

  return {
    id,
    title: template.title,
    category,
    status: "draft",
    prompt: parserText,
    originalPrompt: trimmed,
    normalizationCorrections: normalizedInput.corrections,
    summary: template.summary,
    dateLabel,
    timeLabel,
    durationMinutes: template.durationMinutes,
    sections: materializeSections(id, template.sections),
    calendarSuggestion: template.includeCalendar
      ? {
          title: template.title,
          dateLabel,
          timeLabel,
          durationMinutes: template.durationMinutes,
        }
      : undefined,
    parsedInput: parsed,
    timeline,
    createdAt: new Date().toISOString(),
  };
}
