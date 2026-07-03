import type { ConversationIntent } from "@/lib/sync-engine/input/conversation-intent";
import type { ConversationState } from "@/lib/sync-engine/input/conversation-state";

export type ConversationGoalType =
  | "greet"
  | "acknowledge_capture"
  | "clarify"
  | "connect_recent_context"
  | "surface_judgment"
  | "answer_briefing"
  | "answer_memory_review"
  | "explain_decision"
  | "correction_follow_up"
  | "quiet_confirmation";

export type ConversationGoal = {
  type: ConversationGoalType;
  reason: string;
  confidence: number;
  shouldUseJudgmentPrimary: boolean;
  shouldAvoidStaleJudgment: boolean;
};

type SelectConversationGoalInput = {
  intent: ConversationIntent;
  state: ConversationState;
  memoryDecision: "remember" | "update_existing" | "ignore" | "ask_follow_up";
  category: string;
  importance: string;
  shouldSurfaceLater: boolean;
};

function goal(input: ConversationGoal): ConversationGoal {
  return input;
}

function isLowWeightCategory(category: string, importance: string) {
  return (
    importance === "low" &&
    /^(general|workout|meal|routine|mood|sleep)$/i.test(category)
  );
}

export function selectConversationGoal(
  input: SelectConversationGoalInput,
): ConversationGoal {
  if (input.intent.type === "greeting" || input.intent.type === "small_talk") {
    return goal({
      type: "greet",
      reason: "Greeting and small-talk should guide next useful input.",
      confidence: 0.95,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (input.intent.type === "briefing_request") {
    return goal({
      type: "answer_briefing",
      reason: "User asked what matters now.",
      confidence: 0.95,
      shouldUseJudgmentPrimary: true,
      shouldAvoidStaleJudgment: input.state.staleJudgmentRisk,
    });
  }

  if (input.intent.type === "memory_review_request") {
    return goal({
      type: "answer_memory_review",
      reason: "User asked for memory review.",
      confidence: 0.93,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (input.intent.type === "explanation_request") {
    return goal({
      type: "explain_decision",
      reason: "User asked why Sync made a decision.",
      confidence: 0.9,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (input.intent.type === "correction_request") {
    return goal({
      type: "correction_follow_up",
      reason: "Likely correction needs a precise target.",
      confidence: 0.85,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (input.memoryDecision === "ask_follow_up") {
    return goal({
      type: "clarify",
      reason: "Input is not specific enough to place safely.",
      confidence: 0.8,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (input.state.staleJudgmentRisk) {
    return goal({
      type: "acknowledge_capture",
      reason: "Avoid repeating stale prior judgment on new topic.",
      confidence: 0.84,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (isLowWeightCategory(input.category, input.importance)) {
    return goal({
      type: "quiet_confirmation",
      reason: "Low-weight daily context should be acknowledged lightly.",
      confidence: 0.74,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: true,
    });
  }

  if (input.state.continuationLikely) {
    return goal({
      type: "connect_recent_context",
      reason: "Current turn appears to continue recent context.",
      confidence: 0.72,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: input.state.staleJudgmentRisk,
    });
  }

  if (input.shouldSurfaceLater) {
    return goal({
      type: "surface_judgment",
      reason: "Input has enough consequence to surface in judgment context.",
      confidence: 0.78,
      shouldUseJudgmentPrimary: false,
      shouldAvoidStaleJudgment: input.state.staleJudgmentRisk,
    });
  }

  return goal({
    type: "acknowledge_capture",
    reason: "Default capture acknowledgment keeps the thread coherent.",
    confidence: 0.68,
    shouldUseJudgmentPrimary: false,
    shouldAvoidStaleJudgment: true,
  });
}
