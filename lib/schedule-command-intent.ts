import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";

export type ScheduleCommandIntent =
  | { type: "none" }
  | { type: "delete"; requiresConfirmation: true }
  | { type: "deactivate"; requiresConfirmation: true }
  | { type: "update"; query: string; requiresConfirmation: true };

function isScheduleCommandText(text: string) {
  return /\b(?:my\s+)?work\s+schedule\b/.test(text) || /\bmy\s+shifts?\s+are\b/.test(text);
}

export function detectScheduleCommandIntent(
  input: string,
): ScheduleCommandIntent {
  const text = normalizeCaptureInput(input).normalized;

  if (
    /\b(?:delete|remove)\s+(?:my\s+)?work\s+schedule\b/.test(text) ||
    (/\b(?:delete|remove)\s+my\s+schedule\b/.test(text) &&
      /\bwork\b/.test(input.toLowerCase()))
  ) {
    return { type: "delete", requiresConfirmation: true };
  }

  if (
    /\bstop\s+showing\s+(?:my\s+)?work\s+schedule\b/.test(text) ||
    /\bhide\s+(?:my\s+)?work\s+schedule\b/.test(text)
  ) {
    return { type: "deactivate", requiresConfirmation: true };
  }

  if (
    /\b(?:change|update)\s+(?:my\s+)?work\s+schedule\b/.test(text) ||
    /\b(?:my\s+)?work\s+schedule\s+changed\s+to\b/.test(text)
  ) {
    return { type: "update", query: input.trim(), requiresConfirmation: true };
  }

  if (isScheduleCommandText(text) && /\b(?:change|update|delete|remove|stop)\b/.test(text)) {
    if (/\b(?:delete|remove)\b/.test(text)) {
      return { type: "delete", requiresConfirmation: true };
    }
    if (/\bstop\b/.test(text)) {
      return { type: "deactivate", requiresConfirmation: true };
    }
    return { type: "update", query: input.trim(), requiresConfirmation: true };
  }

  return { type: "none" };
}

export function extractScheduleUpdateQuery(input: string): string {
  const text = normalizeCaptureInput(input).normalized;
  const changed = text.match(/(?:my\s+)?work\s+schedule\s+changed\s+to\s+(.+)$/);
  if (changed) return `my work schedule is ${changed[1].trim()}`;

  const update = text.match(
    /(?:change|update)\s+(?:my\s+)?work\s+schedule\s+(?:to\s+)?(.+)$/,
  );
  if (update) return `my work schedule is ${update[1].trim()}`;

  return input.trim();
}
