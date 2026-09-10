/**
 * Map chat API failures to calm copy, and decide whether local capture may persist.
 * Failed auth/limit must not look like a successful Sync turn.
 */
export function chatClientFailureMessage(
  status: number,
  error?: string | null,
): string {
  const specific = error?.trim();
  if (status === 401 || status === 403) {
    return specific || "Sign in to keep this with Sync.";
  }
  if (status === 429) {
    return specific || "Too many chat requests. Please try again later.";
  }
  if (status === 503) {
    return specific || "Chat is temporarily unavailable.";
  }
  if (status >= 400) {
    return specific || "Could not save that just now.";
  }
  return specific || "Could not reach chat. Check your connection and try again.";
}

export function shouldPersistChatCapture(status: number): boolean {
  return status >= 200 && status < 300;
}
