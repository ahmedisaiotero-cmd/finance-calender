import {
  classifySettlementClaim,
  isUnverifiedSettlementClaim,
  unverifiedSettlementFollowUp,
} from "@/lib/intelligence/settlement-claim";

export type VagueInputMissing =
  | "object"
  | "person"
  | "time"
  | "location"
  | "action_target"
  | "payment_target"
  | "payment_confirmation";

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
const DATE_OR_DAY_PATTERN =
  /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|next month|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i;
const EXACT_DATE_PATTERN =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b/i;

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

  if (/^(it'?s|it s|it is)\s+(today|tomorrow|tonight|next week|this week)\b/i.test(compact)) {
    return ask(
      ["object"],
      "Pronoun-only timing is missing the actual event or commitment.",
      "What is happening then?",
    );
  }

  if (/^(something|stuff|things?|something important)\s+(today|tomorrow|tonight|next week|this week)\b/i.test(compact)) {
    return ask(
      ["object"],
      "Timed placeholder is missing the actual event or commitment.",
      DATE_OR_DAY_PATTERN.test(compact)
        ? "What is happening then?"
        : "What should Sync remember?",
    );
  }

  if (
    /\bremind me about\b/i.test(compact) &&
    /\bbirthday|bday\b/i.test(compact) &&
    /\bnext month\b/i.test(compact) &&
    !EXACT_DATE_PATTERN.test(compact)
  ) {
    return ask(
      ["time"],
      "Birthday reminder is missing the specific date.",
      "What date is the birthday?",
    );
  }

  if (/^(move|reschedule|change)\s+(it|that|this)\s+to\b/i.test(compact)) {
    return ask(
      ["object"],
      "Edit target is unclear.",
      "What should I move?",
    );
  }

  if (/^remind me later\b/i.test(compact)) {
    return ask(
      ["object", "time"],
      "Reminder is missing the subject and useful timing.",
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

  if (/\bfollow up with (her|him|them)\b/i.test(compact)) {
    return ask(
      ["person", "object"],
      "Follow-up target is unclear.",
      "Who should you follow up with, and about what?",
    );
  }

  if (/\b(i'?m|i m|i am)\s+going somewhere\b/i.test(compact)) {
    return ask(
      ["location"],
      "Travel location is missing.",
      "Where are you going, and when?",
    );
  }

  if (
    /\bflight\b/i.test(compact) &&
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i.test(compact) &&
    !DATE_OR_DAY_PATTERN.test(compact)
  ) {
    return ask(
      ["time"],
      "Flight time is present but the travel date is missing.",
      "What day is the flight?",
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

  const settlement = classifySettlementClaim(trimmed);
  if (isUnverifiedSettlementClaim(trimmed)) {
    return ask(
      settlement.obligationKey ? ["payment_confirmation"] : ["payment_target", "payment_confirmation"],
      "Payment is unverified, so Sync will not remember it as settled.",
      unverifiedSettlementFollowUp(trimmed),
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
