import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import {
  detectSyncCommandIntent,
  type SyncCommandIntent,
} from "@/lib/sync-command-intent";
import type { ReferenceResolution } from "@/lib/trust/reference-resolution";

export type SyncInterpretation = {
  id: string;
  label: string;
  description: string;
  intent: "create" | "edit" | "delete";
  confidence: number;
  payload: unknown;
};

export type AmbiguityResult = {
  ambiguous: boolean;
  reason?: string;
  interpretations: SyncInterpretation[];
};

const COMMAND_VERB_PATTERN =
  /^(change|move|reschedule|update|rename|delete|remove|cancel|make|actually)\b/i;

const DAY_PATTERN =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i;

type DetectAmbiguityInput = {
  text: string;
  commandIntent?: SyncCommandIntent;
  referenceResolution?: ReferenceResolution;
  now?: Date;
};

function hasCommandLanguage(text: string) {
  return COMMAND_VERB_PATTERN.test(text.trim());
}

function isIncompleteEdit(commandIntent: SyncCommandIntent) {
  if (commandIntent.type !== "edit") return false;

  const hasDestination =
    Boolean(commandIntent.toDateLabel) || Boolean(commandIntent.toTime);

  if (commandIntent.operation === "rename") {
    return !commandIntent.toDateLabel && !commandIntent.toTime;
  }

  if (commandIntent.operation === "move" || commandIntent.operation === "reschedule") {
    return !hasDestination;
  }

  return !hasDestination && !commandIntent.fromDateLabel;
}

function partialMoveWithoutTo(text: string) {
  return /^(move|reschedule)\s+.+\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i.test(
    text.trim(),
  ) && !/\bto\b/i.test(text);
}

function buildCreateInterpretation(text: string, now?: Date): SyncInterpretation | null {
  const plan = createPulsePlan(text, { timeline: { now: now ?? new Date() } });
  const confidence = plan.timeline?.confidence ?? 0.5;

  return {
    id: "create-event",
    label: "Create a new item",
    description: plan.title
      ? `Save as "${plan.title}" on your timeline.`
      : "Save this as a new calendar item.",
    intent: "create",
    confidence,
    payload: { plan },
  };
}

function buildEditInterpretation(
  commandIntent: Extract<SyncCommandIntent, { type: "edit" }>,
): SyncInterpretation {
  const from = commandIntent.fromDateLabel ?? "the current day";
  const to = commandIntent.toDateLabel ?? commandIntent.toTime ?? "a new time";

  return {
    id: "edit-existing",
    label: "Update an existing item",
    description: `Move ${commandIntent.targetText} from ${from} to ${to}.`,
    intent: "edit",
    confidence: 0.88,
    payload: { commandIntent },
  };
}

function buildDeleteInterpretation(
  commandIntent: Extract<SyncCommandIntent, { type: "delete" }>,
): SyncInterpretation {
  return {
    id: "delete-existing",
    label: "Remove an existing item",
    description: `Remove ${commandIntent.targetText} from Sync.`,
    intent: "delete",
    confidence: 0.9,
    payload: { commandIntent },
  };
}

function buildDateRangeInterpretation(
  text: string,
  now?: Date,
): SyncInterpretation | null {
  const plan = createPulsePlan(text, { timeline: { now: now ?? new Date() } });
  if (plan.timeline?.kind !== "date_range") return null;

  return {
    id: "create-date-range",
    label: "Create a multi-day event",
    description: `Treat this as ${plan.timeline.label ?? "a date range"} on your calendar.`,
    intent: "create",
    confidence: Math.max(plan.timeline.confidence ?? 0.5, 0.62),
    payload: { plan },
  };
}

export function detectAmbiguity(input: DetectAmbiguityInput): AmbiguityResult {
  const text = input.text.trim();
  const commandIntent = input.commandIntent ?? detectSyncCommandIntent(text);
  const interpretations: SyncInterpretation[] = [];

  if (commandIntent.type === "edit") {
    interpretations.push(buildEditInterpretation(commandIntent));

    if (isIncompleteEdit(commandIntent) || partialMoveWithoutTo(text)) {
      return {
        ambiguous: true,
        reason:
          "Sync isn't sure what should move, or where it should go. A little more detail will help.",
        interpretations: [
          ...interpretations,
          {
            id: "clarify-edit",
            label: "Clarify the change",
            description:
              'Try something like "move gym to Friday at 6pm" or "change dinner to Tuesday."',
            intent: "edit",
            confidence: 0.95,
            payload: { needsClarification: true },
          },
        ],
      };
    }

    const dateRange = buildDateRangeInterpretation(text, input.now);
    if (dateRange) {
      interpretations.push(dateRange);
      return {
        ambiguous: true,
        reason:
          "This could be updating something you already have, or creating a new date range.",
        interpretations,
      };
    }

    if (input.referenceResolution?.status === "multiple_matches") {
      return {
        ambiguous: true,
        reason: input.referenceResolution.reason,
        interpretations,
      };
    }

    if (input.referenceResolution?.status === "not_found") {
      return {
        ambiguous: true,
        reason: "Sync heard an update, but couldn't find a clear match.",
        interpretations: [
          ...interpretations,
          {
            id: "clarify-target",
            label: "Name the item more specifically",
            description:
              "Try including the title or day, like \"move date with girlfriend to Friday.\"",
            intent: "edit",
            confidence: 0.9,
            payload: { needsClarification: true },
          },
        ],
      };
    }

    return {
      ambiguous: false,
      interpretations,
    };
  }

  if (commandIntent.type === "delete") {
    interpretations.push(buildDeleteInterpretation(commandIntent));

    if (input.referenceResolution?.status === "multiple_matches") {
      return {
        ambiguous: true,
        reason: input.referenceResolution.reason,
        interpretations,
      };
    }

    if (input.referenceResolution?.status === "not_found") {
      return {
        ambiguous: true,
        reason: "Sync heard a removal, but couldn't find a clear match.",
        interpretations: [
          ...interpretations,
          {
            id: "clarify-delete",
            label: "Name the item more specifically",
            description:
              'Try something like "delete doctor appointment" or "cancel dinner on Friday."',
            intent: "delete",
            confidence: 0.9,
            payload: { needsClarification: true },
          },
        ],
      };
    }

    return {
      ambiguous: false,
      interpretations,
    };
  }

  const createInterpretation = buildCreateInterpretation(text, input.now);
  if (createInterpretation) {
    interpretations.push(createInterpretation);
  }

  if (hasCommandLanguage(text)) {
    const dateRange = buildDateRangeInterpretation(text, input.now);
    if (dateRange) {
      interpretations.unshift(dateRange);
    }

    return {
      ambiguous: true,
      reason:
        "This sounds like it might change something existing. Sync won't create a new item unless you choose that.",
      interpretations: [
        {
          id: "clarify-command",
          label: "Clarify what you want to change",
          description:
            'Try "move gym to Friday" or "delete doctor appointment" instead.',
          intent: "edit",
          confidence: 0.82,
          payload: { needsClarification: true },
        },
        ...(createInterpretation ? [createInterpretation] : []),
      ],
    };
  }

  if (partialMoveWithoutTo(text)) {
    return {
      ambiguous: true,
      reason: "Sync isn't sure where this should move to.",
      interpretations: [
        {
          id: "clarify-move",
          label: "Clarify the move",
          description: 'Try "move gym to Friday at 6pm" with a clear destination.',
          intent: "edit",
          confidence: 0.9,
          payload: { needsClarification: true },
        },
        ...(createInterpretation ? [createInterpretation] : []),
      ],
    };
  }

  const dateRange = buildDateRangeInterpretation(text, input.now);
  if (dateRange && DAY_PATTERN.test(text)) {
    const highConfidenceCreate =
      (createInterpretation?.confidence ?? 0) >= 0.85 &&
      createInterpretation?.payload &&
      typeof createInterpretation.payload === "object" &&
      (createInterpretation.payload as { plan?: { timeline?: { kind?: string } } })
        .plan?.timeline?.kind === "date_range";

    if (highConfidenceCreate && hasCommandLanguage(text)) {
      return {
        ambiguous: true,
        reason: "This could be a date range or something else entirely.",
        interpretations: [dateRange, ...(createInterpretation ? [createInterpretation] : [])],
      };
    }
  }

  return {
    ambiguous: false,
    interpretations,
  };
}
