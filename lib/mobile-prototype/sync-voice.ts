import type { SyncImportance } from "@/lib/intelligence/importance-scoring";

/** Shared copy — one calm voice across Today, Memory, and My Life. */

export const BRIEF_LOADING = "One moment — pulling your briefing together.";
export const BRIEF_EMPTY_NO_CONTEXT =
  "I'm still learning your life. Tell me what's on your mind.";
export const BRIEF_EMPTY_QUIET = "Quiet for now — nothing pressing.";
export const BRIEF_SECTION_AHEAD = "Ahead";

export const CAPTURE_PROMPT = "What's happening, or what's ahead?";
export const CAPTURE_PLACEHOLDER = "Mom's birthday is December 14.";
export const CAPTURE_FOLLOWUP_PLACEHOLDER = "Friday, June 22, tomorrow…";
export const CAPTURE_REMEMBER = "Remember";

export const CAPTURE_VAGUE =
  "Say what happened, or what's coming — even in a few words.";
export const CAPTURE_DUPLICATE = "I already have that one.";
export const CAPTURE_CLARIFY_WHO = "Who should I connect this to?";
export const CAPTURE_CLARIFY_BIRTHDAY = "Whose birthday should I remember?";
export const CAPTURE_CLARIFY_FLIGHT_TIME = "What time is the flight?";
export const CAPTURE_CLARIFY_RENT_WHEN = "When is rent due?";
export const CAPTURE_CLARIFY_WHEN = "When is this?";
export const CAPTURE_CLARIFY_PLACE =
  "I need a little more to place this.";
export const CAPTURE_CLARIFY_MORE =
  "A bit more detail and I can place this.";
export const CAPTURE_CLARIFY_REMEMBER_WHAT =
  "I can hold that — what should it connect to?";
export const CAPTURE_DELETE_NOT_FOUND =
  "I couldn't find what to remove. Name it a little more specifically.";
export const CAPTURE_EDIT_AMBIGUOUS =
  "I need a bit more detail to make that change.";
export const CAPTURE_EDIT_NOT_FOUND =
  "I heard a change, but couldn't find a clear match.";
export const CAPTURE_EDIT_MEMORY =
  "Say a bit more so I can update this memory.";

export const MEMORY_TITLE = "Memory";
export const MEMORY_SUBTITLE = "What I'm holding.";
export const MEMORY_EMPTY =
  "Nothing here yet. Share something on Today and I'll hold it.";
export const MEMORY_EMPTY_FILTER = "Nothing here in this area yet.";
export const MEMORY_BACK = "← Memory";

export const MEMORY_WHY_HEADING = "Why this matters";
export const MEMORY_SAID_HEADING = "What you said";
export const MEMORY_UNDERSTOOD_HEADING = "What I understood";
export const MEMORY_DETAILS_HEADING = "The details";
export const MEMORY_RELATED_HEADING = "Connected memories";
export const MEMORY_EDIT_HEADING = "Correct this";
export const MEMORY_EDIT_SAVE = "Save";
export const MEMORY_EDIT_CANCEL = "Cancel";
export const MEMORY_EDIT_ACTION = "Correct";
export const MEMORY_REMOVE_ACTION = "Let this go";

export const MEMORY_LABEL_WEIGHT = "Weight";
export const MEMORY_LABEL_AREA = "Lives in";
export const MEMORY_LABEL_PERSON = "Connected to";
export const MEMORY_LABEL_WHEN = "When";
export const MEMORY_LABEL_REPEATS = "Repeats";
export const MEMORY_LABEL_NEXT = "Next";
export const MEMORY_LABEL_BRIEF = "In your briefing";
export const MEMORY_LABEL_SURFACE = "May surface";
export const MEMORY_LABEL_TIME = "Shapes your time";

export const LIFE_TITLE = "My Life";
export const LIFE_SUBTITLE = "What I know about you. Adjust anything — I'll listen.";
export const LIFE_BACK = "Back";
export const LIFE_NAME_LABEL = "What I call you";
export const LIFE_NAME_PLACEHOLDER = "Your first name";
export const LIFE_WEEK_LABEL = "Your rhythm";
export const LIFE_WEEK_PLACEHOLDER =
  "I work Sunday through Wednesday, 11 AM to 9 PM.";
export const LIFE_PRIORITIES_LABEL = "What matters most right now";
export const LIFE_AWARENESS_LABEL = "What to keep on my radar";
export const LIFE_COMING_UP_LABEL = "On the horizon";
export const LIFE_COMING_UP_PLACEHOLDER =
  "Mom's birthday June 22.\nPayday Friday.";
export const LIFE_SAVED = "Saved — I'll carry this into future briefings.";
export const LIFE_SAVE = "Save";
export const LIFE_CLOSE = "Close";

export const ONBOARDING_TAGLINE = "Stay in Sync.";
export const ONBOARDING_LEDE = "Tell me what matters. I'll remember.";
export const ONBOARDING_BEGIN = "Begin";
export const ONBOARDING_BUILDING_TITLE = "Building your first briefing…";
export const ONBOARDING_BUILDING_COPY = "I'm learning the shape of your life.";
export const ONBOARDING_CONTINUE = "Continue";
export const ONBOARDING_SEE_BRIEFING = "See my briefing";

export function describeImportance(level: SyncImportance | string): string {
  switch (level.toLowerCase()) {
    case "critical":
      return "Needs you soon";
    case "high":
      return "High on my radar";
    case "medium":
      return "Worth keeping in view";
    case "low":
      return "Light for now";
    default:
      return level;
  }
}

export function describeBriefPresence(mentioned: boolean): string {
  return mentioned ? "Showing today" : "Not in today's briefing";
}

export function describeSurfaceEligibility(eligible: boolean): string {
  return eligible ? "When timing matters" : "Keeping quiet for now";
}

export function describeTimeImpact(hasImpact: boolean): string {
  return hasImpact ? "Shapes your time" : "No calendar footprint";
}

export function formatCaptureAcknowledgment(
  kind: "create" | "edit" | "delete",
  title: string,
  timing?: string | null,
): string {
  if (kind === "delete") {
    return `Let go — ${title}.`;
  }
  if (kind === "edit") {
    return `Updated — ${title}.`;
  }
  if (timing) {
    return `Got it — ${timing}.`;
  }
  return `Got it — ${title}.`;
}

export function whyRememberedFallback(): string {
  return "You asked me to hold this — I'll surface it when it matters.";
}
