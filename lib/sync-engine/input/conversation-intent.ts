export type ConversationIntentType =
  | "greeting"
  | "small_talk"
  | "capture"
  | "briefing_request"
  | "memory_review_request"
  | "explanation_request"
  | "correction_request"
  | "privacy_command"
  | "destructive_command"
  | "unknown";

export type ConversationIntent = {
  type: ConversationIntentType;
  confidence: number;
  routedBeforeCapture: boolean;
  reason: string;
};

function defaultCaptureIntent(): ConversationIntent {
  return {
    type: "capture",
    confidence: 0.9,
    routedBeforeCapture: false,
    reason: "No conversational shortcut was detected.",
  };
}

export function detectConversationIntent(text: string): ConversationIntent {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return defaultCaptureIntent();

  if (/^(hi|hello|hey|hey sync|yo)\b/.test(normalized)) {
    return {
      type: "greeting",
      confidence: 0.95,
      routedBeforeCapture: true,
      reason: "Greeting detected.",
    };
  }

  if (/how are you|what's up|whats up/.test(normalized)) {
    return {
      type: "small_talk",
      confidence: 0.8,
      routedBeforeCapture: true,
      reason: "Small-talk pattern detected.",
    };
  }

  if (/what matters today|what should i focus on|today brief/.test(normalized)) {
    return {
      type: "briefing_request",
      confidence: 0.95,
      routedBeforeCapture: true,
      reason: "User requested a current priorities summary.",
    };
  }

  if (/what do you remember about me|what do you know about me/.test(normalized)) {
    return {
      type: "memory_review_request",
      confidence: 0.92,
      routedBeforeCapture: true,
      reason: "User asked for memory review.",
    };
  }

  if (/why did you remember that|why did you save that/.test(normalized)) {
    return {
      type: "explanation_request",
      confidence: 0.9,
      routedBeforeCapture: true,
      reason: "User asked for explanation of a prior decision.",
    };
  }

  if (
    /^(actually|no,|wait,)/.test(normalized) &&
    /not|instead|was/.test(normalized)
  ) {
    return {
      type: "correction_request",
      confidence: 0.72,
      routedBeforeCapture: true,
      reason: "Likely correction without explicit target context.",
    };
  }

  return defaultCaptureIntent();
}
