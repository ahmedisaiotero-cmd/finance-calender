import type { CapturedSyncItem } from "@/lib/captured-items";
import type { ContradictionDetection } from "@/lib/sync-engine/reasoning/contradiction";
import type { ConversationTurn } from "@/lib/sync-engine/input/conversation-state";

export type CorrectionTarget = {
  detected: boolean;
  confidence: number;
  action: "update_existing" | "ask_follow_up" | "none";
  targetMemoryId?: string;
  candidateMemoryIds: string[];
  reason: string;
};

const STOPWORDS = new Set([
  "actually",
  "that",
  "was",
  "is",
  "now",
  "the",
  "a",
  "an",
  "it",
  "i",
  "my",
  "to",
  "on",
  "of",
  "and",
  "through",
  "every",
  "am",
  "at",
  "actual",
]);

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return normalize(text)
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token));
}

function hasCorrectionCue(text: string) {
  return /\b(actually|actual|instead|now|correction|not|that was|this was)\b/i.test(text);
}

function domainFor(text: string) {
  const normalized = normalize(text);
  if (/\b(work|shift|schedule|meeting|job)\b/.test(normalized)) return "work";
  if (/\b(rent|bill|pay|money|budget|finance)\b/.test(normalized)) return "finance";
  if (/\b(mom|dad|family|friend|partner|birthday)\b/.test(normalized)) return "relationships";
  if (/\b(health|workout|sleep|hungry|woke|doctor)\b/.test(normalized)) return "health";
  return "general";
}

function recentConversationHints(turns: ConversationTurn[]) {
  const userTurns = turns
    .filter((turn) => turn.role === "user" && turn.text.trim().length > 0)
    .slice(-6);
  return userTurns.map((turn) => turn.text);
}

function tokenOverlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

function recencyWeight(item: CapturedSyncItem) {
  const ts = Date.parse(item.updatedAt ?? item.createdAt ?? "");
  if (Number.isNaN(ts)) return 0;
  return ts / 1_000_000_000_000;
}

function scoreCandidate(input: {
  textTokens: string[];
  text: string;
  item: CapturedSyncItem;
  contradiction: ContradictionDetection;
  maxRecency: number;
  recentHints: string[];
  inputDomain: string;
}) {
  const itemText = normalize(`${input.item.title} ${input.item.prompt}`);
  const itemTokens = tokenize(itemText);
  const tokenOverlap = tokenOverlapCount(input.textTokens, itemTokens) * 1.4;
  const contradictionBoost = input.contradiction.relatedMemoryIds.includes(input.item.id) ? 4 : 0;
  const personOverlap =
    /\b(mom|dad|girlfriend|boyfriend|partner|wife|husband|brother|sister)\b/i.test(
      input.text,
    ) &&
    /\b(mom|dad|girlfriend|boyfriend|partner|wife|husband|brother|sister)\b/i.test(itemText)
      ? 2
      : 0;
  const dateOverlap =
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)\b/i.test(input.text) &&
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)\b/i.test(itemText)
      ? 1
      : 0;
  const contradictionTypeBoost =
    input.contradiction.type === "date" && /\b(due|birthday)\b/.test(itemText)
      ? 2
      : input.contradiction.type === "schedule" && /\bwork\b/.test(itemText)
        ? 2
        : input.contradiction.type === "preference" &&
            /\b(like|love|hate|prefer|vegetarian|steak)\b/.test(itemText)
          ? 2
          : 0;
  const recencyScoreRaw = recencyWeight(input.item);
  const recencyScore = input.maxRecency > 0 ? recencyScoreRaw / input.maxRecency : 0;
  const itemDomain = domainFor(itemText);
  const domainBoost =
    input.inputDomain !== "general" && input.inputDomain === itemDomain ? 3 : 0;
  const numberTokens = input.text.match(/\b\d{1,2}(?::\d{2})?\b/g) ?? [];
  const numberOverlap = numberTokens.filter((token) => itemText.includes(token)).length;
  const recentHintBoost = input.recentHints.reduce((sum, hint) => {
    const overlap = tokenOverlapCount(tokenize(hint), itemTokens);
    const hintDomain = domainFor(hint);
    if (overlap === 0) return sum;
    const domainMatch =
      hintDomain !== "general" && hintDomain === itemDomain ? 0.8 : 0.3;
    return sum + Math.min(1.5, overlap * 0.4 + domainMatch);
  }, 0);

  return (
    tokenOverlap +
    contradictionBoost +
    personOverlap +
    dateOverlap +
    contradictionTypeBoost +
    recencyScore +
    domainBoost +
    numberOverlap +
    recentHintBoost
  );
}

export function detectCorrectionTarget(input: {
  text: string;
  items: CapturedSyncItem[];
  contradiction: ContradictionDetection;
  conversationTurns?: ConversationTurn[];
}): CorrectionTarget {
  const text = input.text.trim();
  if (!text) {
    return {
      detected: false,
      confidence: 0,
      action: "none",
      candidateMemoryIds: [],
      reason: "Input is empty.",
    };
  }

  const correctionCue = hasCorrectionCue(text);
  const contradictionDriven = input.contradiction.detected;
  if (!correctionCue && !contradictionDriven) {
    return {
      detected: false,
      confidence: 0,
      action: "none",
      candidateMemoryIds: [],
      reason: "No correction or contradiction signal detected.",
    };
  }

  const textTokens = tokenize(text);
  const inputDomain = domainFor(text);
  const recentHints = recentConversationHints(input.conversationTurns ?? []);
  const candidates = contradictionDriven
    ? input.items.filter((item) => input.contradiction.relatedMemoryIds.includes(item.id))
    : input.items;

  if (candidates.length === 0) {
    return {
      detected: true,
      confidence: 0.2,
      action: "ask_follow_up",
      candidateMemoryIds: [],
      reason: "No existing memory matches the correction target.",
    };
  }

  const weekdayCorrection = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
    text,
  );
  if (weekdayCorrection && candidates.length === 1) {
    const only = candidates[0];
    const existingText = normalize(`${only.title} ${only.prompt}`);
    if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(existingText)) {
      return {
        detected: true,
        confidence: 0.8,
        action: "update_existing",
        targetMemoryId: only.id,
        candidateMemoryIds: [only.id],
        reason: "Single recent date memory likely matches this correction.",
      };
    }
  }

  const maxRecency = Math.max(...candidates.map((item) => recencyWeight(item)), 0);
  const scored = candidates
    .map((item) => ({
      item,
      score: scoreCandidate({
        textTokens,
        text,
        item,
        contradiction: input.contradiction,
        maxRecency,
        recentHints,
        inputDomain,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  const candidateMemoryIds = scored.map((entry) => entry.item.id);

  const ambiguousPronoun = /\b(it|that|this|she|he|they)\b/i.test(text);
  const closeScores = Boolean(second) && top.score - second.score <= 1;
  const hasExplicitDomain = inputDomain !== "general";
  const scoreGap = second ? top.score - second.score : top.score;
  const clearEnough =
    (top.score >= 4.5 && !(ambiguousPronoun && closeScores)) ||
    (top.score >= 3.2 && scoreGap >= 1.1) ||
    (hasExplicitDomain && top.score >= 2.8 && scoreGap >= 0.8);

  if (!clearEnough) {
    return {
      detected: true,
      confidence: Math.min(0.55, top.score / 10),
      action: "ask_follow_up",
      candidateMemoryIds,
      reason: "Correction target is ambiguous across multiple memories.",
    };
  }

  return {
    detected: true,
    confidence: Math.min(0.92, 0.6 + top.score / 10),
    action: "update_existing",
    targetMemoryId: top.item.id,
    candidateMemoryIds,
    reason: "Found a clear existing memory to update.",
  };
}
