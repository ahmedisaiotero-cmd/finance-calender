/** User-facing SYNC product copy (single source of truth for Phase 1). */

export const SYNC_PRODUCT = {
  name: "SYNC",
  tagline: "Life on one timeline",
  positioning: "Calendar-first life operating system",
} as const;

export const SYNC_CALENDAR_ALL_HINT =
  "Viewing all categories — Money and Health on your timeline.";

export const SYNC_CATEGORY_SOON_LABEL = "Soon";

export const SYNC_LOADING_LABEL = "Loading your timeline…";

export const SYNC_HOME_SUBTITLE =
  "What deserves your attention right now?";

export const SYNC_HOME_TAGLINE =
  "Money, Health, and Career on one timeline.";

export const SYNC_DB_SYNCED_LABEL = "Synced";

export const SYNC_RECENT_ACTIVITY_TITLE = "Recent activity";

export const SYNC_RECENT_ACTIVITY_SUBTITLE =
  "Money on your SYNC timeline";

export function syncBudgetsSubtitle(monthLabel: string) {
  return `Category limits for ${monthLabel} on your SYNC timeline`;
}
