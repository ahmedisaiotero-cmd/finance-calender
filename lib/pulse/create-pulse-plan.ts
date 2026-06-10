import { detectPulseCategory } from "@/lib/pulse/detect-pulse-category";
import { parsePulsePrompt } from "@/lib/pulse/parse-pulse-prompt";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import {
  buildPulseTemplate,
  materializeSections,
} from "@/lib/pulse/templates";
import {
  resolveTimeline,
  type ResolveTimelineOptions,
} from "@/lib/timeline/resolve-timeline";
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
  const category = detectPulseCategory(parserText);
  const parsed = parsePulsePrompt(parserText, category);
  const timeline = resolveTimeline(parserText, options.timeline);
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
    prompt: trimmed,
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
