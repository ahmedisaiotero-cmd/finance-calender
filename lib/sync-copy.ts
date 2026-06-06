/** User-facing SYNC product copy (single source of truth for Phase 1). */

export const SYNC_PRODUCT = {
  name: "SYNC",
  tagline: "synchronize your life.",
  positioning: "Calendar-first life operating system",
} as const;

/** Sync connects to tools users trust — it does not replace them. */
export const SYNC_INTEGRATION_PHILOSOPHY =
  "Sync connects to the tools you already trust, reads only the signals that matter, and translates them into calm guidance.";

/** Each primary view answers one question within five seconds. */
export const SYNC_PAGE_QUESTIONS = {
  home: "How should I approach today?",
  calendar: "When are the important moments?",
  health: "Am I taking care of myself?",
  finance: "Am I financially on track?",
} as const;

export function getTimeGreeting(name: string, reference = new Date()) {
  const hour = reference.getHours();
  const period =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${period}, ${name}.`;
}

export const SYNC_CALENDAR_ALL_HINT =
  "All categories on your timeline — tap a day for details.";

export const SYNC_CATEGORY_SOON_LABEL = "Soon";

export const SYNC_LOADING_LABEL = "Reading your signals…";

export const SYNC_HOME_SUBTITLE = SYNC_PAGE_QUESTIONS.home;

export const SYNC_DB_SYNCED_LABEL = "Connected";

export const SYNC_RECENT_ACTIVITY_TITLE = "Recent activity";

export const SYNC_RECENT_ACTIVITY_SUBTITLE =
  "From your connected accounts";

export function syncBudgetsSubtitle(monthLabel: string) {
  return `Category limits for ${monthLabel}`;
}

/** Attribution for a connected source — trust the tool, not Sync. */
export function sourceViaLabel(source: string) {
  return `via ${source}`;
}
