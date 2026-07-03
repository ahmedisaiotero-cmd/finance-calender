export type VagueInputMissing =
  | "object"
  | "person"
  | "time"
  | "location"
  | "action_target"
  | "payment_target";

export type VagueInputRecommendedAction =
  | "ask_follow_up"
  | "low_confidence_memory"
  | "ignore";

export type VagueInputDetection = {
  detected: boolean;
  missing: VagueInputMissing[];
  reason: string;
  recommendedAction: VagueInputRecommendedAction;
  followUpQuestion?: string;
};

const DAY_OR_TIME_PATTERN =
  /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|at \d|before|after|by)\b/i;

function clearResult(): VagueInputDetection {
  return {
    detected: false,
    missing: [],
    reason: "Input is specific enough for normal processing.",
    recommendedAction: "low_confidence_memory",
  };
}

function ask(
  missing: VagueInputMissing[],
  reason: string,
  followUpQuestion: string,
): VagueInputDetection {
  return {
    detected: true,
    missing,
    reason,
    recommendedAction: "ask_follow_up",
    followUpQuestion,
  };
}

export function detectVagueInput(text: string): VagueInputDetection {
  const trimmed = text.trim();
  const normalized = trimmed.toLowerCase().replace(/[^\w\s']/g, " ");
  const compact = normalized.replace(/\s+/g, " ").trim();

  if (!compact) {
    return ask(["object"], "Input was empty.", "What should Sync know?");
  }

  if (/\b(i have|there is|there's)\s+(an?\s+)?appointment\b/i.test(compact)) {
    const hasSpecificType =
      /\b(dentist|doctor|therapy|meeting|interview|vet|school|work)\b/i.test(
        compact,
      );
    if (!hasSpecificType || !DAY_OR_TIME_PATTERN.test(compact)) {
      return ask(
        ["object", "time"],
        "Appointment input is missing type or timing.",
        "What appointment is it, and when is it?",
      );
    }
  }

  if (/\b(that thing|something|it)\s+(got\s+)?moved\b/i.test(compact)) {
    return ask(
      ["object", "time"],
      "Moved item is unclear.",
      "What moved, and when is it now?",
    );
  }

  if (/\b(cancel|canceled|cancelled)\s+(something|it|that)\b/i.test(compact)) {
    return ask(
      ["action_target"],
      "Cancellation target is unclear.",
      "What needs canceling, and by when?",
    );
  }

  if (/\bremind me about (that|it|something)\b/i.test(compact)) {
    return ask(
      ["object", "time"],
      "Reminder target is unclear.",
      "What should I remind you about, and when?",
    );
  }

  if (/\bsomething important\b/i.test(compact)) {
    return ask(
      ["object"],
      "Important event is unspecified.",
      DAY_OR_TIME_PATTERN.test(compact)
        ? "What is happening then?"
        : "What important thing is happening?",
    );
  }

  if (/\b(i'?m|i m|i am)\s+going somewhere\b/i.test(compact)) {
    return ask(
      ["location"],
      "Travel location is missing.",
      "Where are you going, and when?",
    );
  }

  if (/\b(talk|call|text|message)\s+to\s+(her|him|them)\b/i.test(compact)) {
    return ask(
      ["person"],
      "Person reference is unclear.",
      "Who do you need to talk to?",
    );
  }

  if (/\bi paid it\b/i.test(compact)) {
    return ask(
      ["payment_target"],
      "Payment target is unclear.",
      "What did you pay?",
    );
  }

  if (/\b(it'?s|it s|it is)\s+due\b/i.test(compact)) {
    return ask(
      ["payment_target"],
      "Due item is unclear.",
      "What is due?",
    );
  }

  return clearResult();
}
