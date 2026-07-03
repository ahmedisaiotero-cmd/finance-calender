export type PrivacyCommandType =
  | "delete_all"
  | "delete_topic"
  | "export_all"
  | "show_topic"
  | "unknown";

export type PrivacyCommandDetection = {
  detected: boolean;
  type: PrivacyCommandType;
  target?: string;
  requiresConfirmation: boolean;
  safeToExecuteInDryRun: boolean;
};

const REMINDER_PREFIX = /^\s*(remind me to|remember to|i need to|need to)\b/i;

function normalizeTarget(value: string) {
  return value
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/^(my|the|all)\s+/i, "")
    .trim()
    .toLowerCase();
}

function deleteTopicTarget(text: string) {
  const topicMatch = text.match(/\b(?:remove|delete|forget|erase)\s+topic\s+(.+)$/i);
  if (topicMatch?.[1]) return normalizeTarget(topicMatch[1]);
  const match = text.match(
    /\b(?:remove|delete|forget|erase)\s+(?:everything\s+)?(?:about|related to|for)\s+(.+)$/i,
  );
  if (!match?.[1]) return undefined;
  return normalizeTarget(match[1]);
}

function showTopicTarget(text: string) {
  const topicMatch = text.match(/\bshow\s+topic\s+(.+)$/i);
  if (topicMatch?.[1]) return normalizeTarget(topicMatch[1]);
  const match = text.match(/\bwhat do you know about\s+(.+)$/i);
  if (!match?.[1]) return undefined;
  return normalizeTarget(match[1]);
}

export function detectPrivacyCommand(text: string): PrivacyCommandDetection {
  const trimmed = text.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || REMINDER_PREFIX.test(trimmed)) {
    return {
      detected: false,
      type: "unknown",
      requiresConfirmation: false,
      safeToExecuteInDryRun: true,
    };
  }

  const target = deleteTopicTarget(trimmed);
  if (target) {
    return {
      detected: true,
      type: "delete_topic",
      target,
      requiresConfirmation: true,
      safeToExecuteInDryRun: false,
    };
  }

  if (
    /\b(delete|forget|erase|remove)\b/.test(normalized) &&
    /\b(all memories|everything you know|everything about me|my data|all data|all my memories)\b/.test(
      normalized,
    )
  ) {
    return {
      detected: true,
      type: "delete_all",
      requiresConfirmation: true,
      safeToExecuteInDryRun: false,
    };
  }

  if (
    /\b(tell me everything you know about me|show me everything you remember|show all you know about me|show me all memories|export my memory|export all memories|download my memory)\b/.test(
      normalized,
    )
  ) {
    return {
      detected: true,
      type: "export_all",
      requiresConfirmation: true,
      safeToExecuteInDryRun: false,
    };
  }

  const showTarget = showTopicTarget(trimmed);
  if (showTarget) {
    return {
      detected: true,
      type: "show_topic",
      target: showTarget,
      requiresConfirmation: true,
      safeToExecuteInDryRun: false,
    };
  }

  if (/\b(memory|memories|data)\b/.test(normalized) && /\b(delete|forget|erase|export|show)\b/.test(normalized)) {
    return {
      detected: true,
      type: "unknown",
      requiresConfirmation: true,
      safeToExecuteInDryRun: false,
    };
  }

  return {
    detected: false,
    type: "unknown",
    requiresConfirmation: false,
    safeToExecuteInDryRun: true,
  };
}
