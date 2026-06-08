import { detectPulseCategory } from "@/lib/pulse/detect-pulse-category";
import { parsePulsePrompt } from "@/lib/pulse/parse-pulse-prompt";
import {
  buildPulseTemplate,
  materializeSections,
} from "@/lib/pulse/templates";
import type { PulsePlan } from "@/lib/pulse/types";

export { detectPulseCategory } from "@/lib/pulse/detect-pulse-category";
export { parsePulsePrompt } from "@/lib/pulse/parse-pulse-prompt";

function createPlanId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pulse-${Date.now()}`;
}

export function createPulsePlan(prompt: string): PulsePlan {
  const trimmed = prompt.trim();
  const category = detectPulseCategory(trimmed);
  const parsed = parsePulsePrompt(trimmed, category);
  const template = buildPulseTemplate(category, trimmed, parsed);
  const id = createPlanId();

  const dateLabel = parsed.dateLabel ?? "Upcoming";
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
    createdAt: new Date().toISOString(),
  };
}
