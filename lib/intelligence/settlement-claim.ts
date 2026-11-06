import type { VerificationLevel } from "@/lib/activity/types";

/**
 * Named money obligation a settlement or due statement is about.
 * Shared by Understanding (vague input), Memory Decision (contradiction),
 * and Judgment (do not treat unverified "paid" as closing an open due).
 */
export type MoneyObligationKey = "rent" | "electric" | "bill";

export type SettlementActor = "user" | "assistant" | "unknown";

export type MoneyObligationState = "due" | "paid";

export type SettlementClaim = {
  detected: boolean;
  obligationKey: MoneyObligationKey | null;
  actor: SettlementActor;
  verification: VerificationLevel;
  state: MoneyObligationState | null;
};

const INCOME_PATTERN =
  /\b(get paid|got paid|gets paid|payday|pay day|paycheck|pay cheque)\b/i;

const ASSISTANT_ACTOR_PATTERN =
  /\b(assistant|chatgpt|chat gpt|copilot|claude|gemini|an?\s+ai|the\s+ai|\bagent\b)\b/i;

const FIRST_PERSON_PAID_PATTERN =
  /\b(i|we)\s+(just\s+)?(paid|payed)\b/i;

const PAID_PATTERN = /\b(paid|payed)\b/i;
const DUE_PATTERN = /\b(due|overdue)\b/i;

function obligationKeyFromText(text: string): MoneyObligationKey | null {
  if (/\brent\b/i.test(text)) return "rent";
  if (/\belectric\b/i.test(text)) return "electric";
  if (/\b(bill|utility|utilities)\b/i.test(text)) return "bill";
  return null;
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s']/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Classify a capture as an income event, an open due, or a settlement claim.
 * "I got paid Friday" is income, not a settlement. Agent-shaped "paid the rent"
 * is unverified even when the obligation is named.
 */
export function classifySettlementClaim(text: string): SettlementClaim {
  const compact = normalize(text);
  if (!compact || INCOME_PATTERN.test(compact)) {
    return {
      detected: false,
      obligationKey: null,
      actor: "unknown",
      verification: "unverified",
      state: null,
    };
  }

  const obligationKey = obligationKeyFromText(compact);
  const assistant = ASSISTANT_ACTOR_PATTERN.test(compact);
  const userPaid = FIRST_PERSON_PAID_PATTERN.test(compact);
  const mentionsPaid = PAID_PATTERN.test(compact);
  const mentionsDue = DUE_PATTERN.test(compact);

  if (mentionsDue && !mentionsPaid) {
    return {
      detected: Boolean(obligationKey) || /\bit'?s due\b/i.test(compact),
      obligationKey,
      actor: "user",
      verification: "self_reported",
      state: "due",
    };
  }

  if (!mentionsPaid) {
    return {
      detected: false,
      obligationKey,
      actor: "unknown",
      verification: "unverified",
      state: null,
    };
  }

  const actor: SettlementActor = assistant
    ? "assistant"
    : userPaid || Boolean(obligationKey)
      ? "user"
      : "unknown";
  const unverified = actor !== "user";

  return {
    detected: true,
    obligationKey,
    actor,
    verification: unverified ? "unverified" : "self_reported",
    state: "paid",
  };
}

export function isUnverifiedSettlementClaim(text: string): boolean {
  const claim = classifySettlementClaim(text);
  return claim.detected && claim.state === "paid" && claim.verification === "unverified";
}

export function moneyObligationKeyFromText(text: string): MoneyObligationKey | null {
  return obligationKeyFromText(normalize(text));
}

export function moneyObligationStateFromText(text: string): {
  key: MoneyObligationKey | null;
  state: MoneyObligationState | null;
} {
  const claim = classifySettlementClaim(text);
  if (claim.state) {
    return { key: claim.obligationKey, state: claim.state };
  }
  return { key: obligationKeyFromText(normalize(text)), state: null };
}

export function unverifiedSettlementFollowUp(text: string): string {
  const claim = classifySettlementClaim(text);
  if (claim.obligationKey === "rent") {
    return "Did the rent actually go through?";
  }
  if (claim.obligationKey === "electric") {
    return "Did the electric bill actually go through?";
  }
  if (claim.obligationKey === "bill") {
    return "Which bill, and did that payment actually go through?";
  }
  return "What was paid, and did that payment actually go through?";
}
