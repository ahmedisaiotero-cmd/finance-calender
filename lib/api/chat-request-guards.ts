export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_HISTORY_ENTRIES = 6;
export const CHAT_MAX_HISTORY_CONTENT_LENGTH = 2000;

export type ChatHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export function clampChatText(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

export function validateChatMessage(raw: unknown): {
  ok: true;
  message: string;
} | {
  ok: false;
  error: string;
  status: 400;
} {
  if (typeof raw !== "string") {
    return { ok: false, error: "Message required", status: 400 };
  }

  const message = raw.trim();
  if (!message) {
    return { ok: false, error: "Message required", status: 400 };
  }

  if (message.length > CHAT_MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message must be ${CHAT_MAX_MESSAGE_LENGTH} characters or fewer`,
      status: 400,
    };
  }

  return { ok: true, message };
}

export function sanitizeChatHistory(history: unknown): ChatHistoryEntry[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (entry): entry is ChatHistoryEntry =>
        !!entry &&
        typeof entry === "object" &&
        ((entry as ChatHistoryEntry).role === "user" ||
          (entry as ChatHistoryEntry).role === "assistant") &&
        typeof (entry as ChatHistoryEntry).content === "string",
    )
    .slice(-CHAT_MAX_HISTORY_ENTRIES)
    .map((entry) => ({
      role: entry.role,
      content: clampChatText(entry.content, CHAT_MAX_HISTORY_CONTENT_LENGTH),
    }));
}
