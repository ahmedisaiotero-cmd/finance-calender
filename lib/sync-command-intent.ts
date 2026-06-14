import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { resolveTime } from "@/lib/timeline/resolve-time";

export type SyncCommandIntent =
  | { type: "create" }
  | {
      type: "edit";
      operation: "move" | "reschedule" | "rename" | "change_time" | "change_date";
      targetText: string;
      fromDateLabel?: string;
      toDateLabel?: string;
      fromTime?: string;
      toTime?: string;
      requiresConfirmation: true;
    }
  | {
      type: "delete";
      targetText: string;
      requiresConfirmation: true;
    };

const DAY_LABEL_PATTERN =
  "(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|last\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))";
const TIME_LABEL_PATTERN = "\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?";

function labelCase(value?: string) {
  if (!value) return undefined;
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseTimeLabel(value?: string) {
  if (!value) return undefined;
  return resolveTime(`at ${value}`).startTime;
}

function classifyEditOperation(
  verb: string,
  toDateLabel?: string,
  toTime?: string,
): Extract<SyncCommandIntent, { type: "edit" }>["operation"] {
  if (/rename/i.test(verb)) return "rename";
  if (/reschedule/i.test(verb)) return "reschedule";
  if (/move/i.test(verb)) return "move";
  if (toTime && !toDateLabel) return "change_time";
  if (toDateLabel) return "change_date";
  return "reschedule";
}

function editIntent(
  verb: string,
  targetText: string,
  parts: {
    fromDateLabel?: string;
    toDateLabel?: string;
    fromTime?: string;
    toTime?: string;
  },
): SyncCommandIntent {
  const toTime = parseTimeLabel(parts.toTime);
  const fromTime = parseTimeLabel(parts.fromTime);
  const toDateLabel = labelCase(parts.toDateLabel);
  const fromDateLabel = labelCase(parts.fromDateLabel);

  return {
    type: "edit",
    operation: classifyEditOperation(verb, toDateLabel, toTime),
    targetText: targetText.trim(),
    fromDateLabel,
    toDateLabel,
    fromTime,
    toTime,
    requiresConfirmation: true,
  };
}

export function detectSyncCommandIntent(input: string): SyncCommandIntent {
  const text = normalizeCaptureInput(input).normalized;

  const deleteMatch = text.match(
    /^(?:delete|remove|cancel)\s+(?:the\s+)?(.+)$/i,
  );
  if (deleteMatch) {
    return {
      type: "delete",
      targetText: deleteMatch[1].trim(),
      requiresConfirmation: true,
    };
  }

  const changeFromTo = text.match(
    new RegExp(
      `^(change|move|reschedule)\\s+(.+?)\\s+from\\s+(${DAY_LABEL_PATTERN}|${TIME_LABEL_PATTERN})\\s+to\\s+(${DAY_LABEL_PATTERN}|${TIME_LABEL_PATTERN})$`,
      "i",
    ),
  );
  if (changeFromTo) {
    const from = changeFromTo[3];
    const to = changeFromTo[4];
    const fromIsTime = Boolean(parseTimeLabel(from));
    const toIsTime = Boolean(parseTimeLabel(to));
    return editIntent(changeFromTo[1], changeFromTo[2], {
      fromDateLabel: fromIsTime ? undefined : from,
      toDateLabel: toIsTime ? undefined : to,
      fromTime: fromIsTime ? from : undefined,
      toTime: toIsTime ? to : undefined,
    });
  }

  const changeOnTo = text.match(
    new RegExp(
      `^(change|move|reschedule)\\s+(.+?)\\s+on\\s+(${DAY_LABEL_PATTERN})\\s+to\\s+(${DAY_LABEL_PATTERN}|${TIME_LABEL_PATTERN})$`,
      "i",
    ),
  );
  if (changeOnTo) {
    const to = changeOnTo[4];
    const toIsTime = Boolean(parseTimeLabel(to));
    return editIntent(changeOnTo[1], changeOnTo[2], {
      fromDateLabel: changeOnTo[3],
      toDateLabel: toIsTime ? undefined : to,
      toTime: toIsTime ? to : undefined,
    });
  }

  const moveTo = text.match(
    new RegExp(
      `^(move|reschedule)\\s+(.+?)\\s+to\\s+(${DAY_LABEL_PATTERN}|${TIME_LABEL_PATTERN})$`,
      "i",
    ),
  );
  if (moveTo) {
    const to = moveTo[3];
    const toIsTime = Boolean(parseTimeLabel(to));
    return editIntent(moveTo[1], moveTo[2], {
      toDateLabel: toIsTime ? undefined : to,
      toTime: toIsTime ? to : undefined,
    });
  }

  const changeTo = text.match(
    new RegExp(
      `^(change|update|rename)\\s+(.+?)\\s+to\\s+(${DAY_LABEL_PATTERN}|${TIME_LABEL_PATTERN}|.+)$`,
      "i",
    ),
  );
  if (changeTo) {
    const to = changeTo[3];
    const toIsTime = Boolean(parseTimeLabel(to));
    const toIsDay = new RegExp(`^${DAY_LABEL_PATTERN}$`, "i").test(to);
    return editIntent(changeTo[1], changeTo[2], {
      toDateLabel: toIsDay ? to : undefined,
      toTime: toIsTime ? to : undefined,
    });
  }

  const makeInstead = text.match(
    new RegExp(`^make\\s+(.+?)\\s+(${DAY_LABEL_PATTERN})\\s+instead$`, "i"),
  );
  if (makeInstead) {
    return editIntent("make", makeInstead[1], {
      toDateLabel: makeInstead[2],
    });
  }

  const actuallyMake = text.match(
    new RegExp(`^actually\\s+make\\s+it\\s+(${DAY_LABEL_PATTERN}|${TIME_LABEL_PATTERN})$`, "i"),
  );
  if (actuallyMake) {
    const to = actuallyMake[1];
    const toIsTime = Boolean(parseTimeLabel(to));
    return editIntent("actually make", "it", {
      toDateLabel: toIsTime ? undefined : to,
      toTime: toIsTime ? to : undefined,
    });
  }

  return { type: "create" };
}
