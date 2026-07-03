export type ConversationTurn = {
  role: "user" | "sync";
  text: string;
  timestamp?: string;
  intent?: string;
  memoryDecision?: string;
  category?: string;
  importance?: string;
  judgmentPrimary?: string;
  response?: string;
};

export type ConversationState = {
  recentTurns: ConversationTurn[];
  lastUserInput?: string;
  lastSyncResponse?: string;
  activeTopic?: string;
  recentCategories: string[];
  recentJudgments: string[];
  repeatedJudgment?: string;
  staleJudgmentRisk: boolean;
  continuationLikely: boolean;
};

type ConversationStateCandidate = {
  category?: string;
  judgmentPrimary?: string;
};

const RECENT_TURN_LIMIT = 12;

function normalizeText(text: string | undefined) {
  return (text ?? "").trim().toLowerCase();
}

function topicForText(text: string | undefined) {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  if (/\b(rent|pay|spent|spending|debt|money|paid|budget)\b/.test(normalized)) {
    return "money";
  }
  if (/\b(work|meeting|job|shift|office|deadline)\b/.test(normalized)) {
    return "work";
  }
  if (/\b(mom|dad|family|wife|husband|partner|friend|birthday)\b/.test(normalized)) {
    return "relationships";
  }
  if (/\b(workout|sleep|hungry|tired|health|doctor|woke)\b/.test(normalized)) {
    return "health";
  }
  if (/\b(today|tomorrow|friday|monday|am|pm|due|schedule)\b/.test(normalized)) {
    return "schedule";
  }
  return "";
}

function sharedTopic(a: string | undefined, b: string | undefined) {
  const at = topicForText(a);
  const bt = topicForText(b);
  if (!at || !bt) return false;
  return at === bt;
}

function likelyContinuation(currentInput: string, lastUserInput: string | undefined) {
  const current = normalizeText(currentInput);
  const last = normalizeText(lastUserInput);
  if (!current || !last) return false;

  if (sharedTopic(current, last)) return true;
  if (/^(and|also|but|actually|then|plus|so)\b/.test(current)) return true;
  if (/\b(this|that|it|same)\b/.test(current) && last.length > 0) return true;

  return false;
}

function collectRecentJudgments(turns: ConversationTurn[]) {
  const judgments: string[] = [];
  for (const turn of turns) {
    const value = turn.judgmentPrimary?.trim();
    if (turn.role !== "sync" || !value) continue;
    judgments.push(value);
  }
  return judgments.slice(-6);
}

function repeatedJudgmentFromRecent(judgments: string[]) {
  const counts = new Map<string, number>();
  for (const value of judgments) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  for (const [value, count] of counts.entries()) {
    if (count >= 2) return value;
  }
  return undefined;
}

function hasStaleRisk(input: {
  currentInput: string;
  repeatedJudgment?: string;
  continuationLikely: boolean;
  candidate?: ConversationStateCandidate;
}) {
  if (!input.repeatedJudgment) return false;

  const repeated = normalizeText(input.repeatedJudgment);
  const current = normalizeText(input.currentInput);
  const candidateJudgment = normalizeText(input.candidate?.judgmentPrimary);

  if (!current || !repeated) return false;
  if (candidateJudgment && candidateJudgment === repeated) {
    if (!sharedTopic(current, repeated) && !input.continuationLikely) return true;
    if (/\b(hungry|coffee|woke|tired)\b/.test(repeated) && !sharedTopic(current, repeated)) {
      return true;
    }
  }

  if (!sharedTopic(current, repeated) && !input.continuationLikely) return true;
  return false;
}

export function buildConversationState(input: {
  turns?: ConversationTurn[];
  currentInput: string;
  currentResultCandidate?: ConversationStateCandidate;
}): ConversationState {
  const recentTurns = (input.turns ?? []).slice(-RECENT_TURN_LIMIT);
  const lastUserInput = [...recentTurns]
    .reverse()
    .find((turn) => turn.role === "user" && turn.text.trim().length > 0)?.text;
  const lastSyncResponse = [...recentTurns]
    .reverse()
    .find((turn) => turn.role === "sync" && (turn.response ?? turn.text).trim().length > 0)
    ?.response ?? [...recentTurns].reverse().find((turn) => turn.role === "sync")?.text;
  const recentCategories = Array.from(
    new Set(
      recentTurns
        .map((turn) => turn.category?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(-5);
  const recentJudgments = collectRecentJudgments(recentTurns);
  const repeatedJudgment = repeatedJudgmentFromRecent(recentJudgments);
  const continuationLikely = likelyContinuation(input.currentInput, lastUserInput);
  const activeTopic =
    topicForText(input.currentInput) ||
    topicForText(lastUserInput) ||
    topicForText(lastSyncResponse);
  const staleJudgmentRisk = hasStaleRisk({
    currentInput: input.currentInput,
    repeatedJudgment,
    continuationLikely,
    candidate: input.currentResultCandidate,
  });

  return {
    recentTurns,
    lastUserInput,
    lastSyncResponse,
    activeTopic: activeTopic || undefined,
    recentCategories,
    recentJudgments,
    repeatedJudgment,
    staleJudgmentRisk,
    continuationLikely,
  };
}
