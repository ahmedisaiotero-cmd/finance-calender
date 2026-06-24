import type { SyncImportance } from "@/lib/intelligence/importance-scoring";

/** Shared copy — one calm voice across Today, Memory, and My Life. */

export const BRIEF_LOADING = "One moment — pulling your briefing together.";
export const BRIEF_EMPTY_NO_CONTEXT =
  "I'm still learning your life. Tell me what's on your mind.";
export const BRIEF_EMPTY_QUIET = "Quiet for now — nothing pressing.";
export const BRIEF_SECTION_AHEAD = "Ahead";

export const CAPTURE_PROMPT = "What's happening, or what's ahead?";
export const CAPTURE_COMPACT_PLACEHOLDER = "Tell Sync what happened…";
export const CAPTURE_SAVE_FAILED = "Sync couldn't save that yet.";
export const CAPTURE_VOICE_LABEL = "Speak";
export const CAPTURE_VOICE_LISTENING = "Listening…";
export const CAPTURE_PLACEHOLDER = "Mom's birthday is December 14.";
export const CAPTURE_FOLLOWUP_PLACEHOLDER = "Friday, June 22, tomorrow…";
export const CAPTURE_REMEMBER = "Remember";
export const CAPTURE_PREVIEW = "Preview";
export const CAPTURE_EDIT = "Edit";
export const CAPTURE_CANCEL = "Cancel";
export const HOME_NEXT_PRIORITY = "Next priority";
export const HOME_FORECAST = "Forecast";
export const HOME_QUIET = "Today is quiet.";
export const HOME_NOTHING_NEEDS_ATTENTION = "Nothing needs your attention right now.";
export const HOME_EMPTY_HEADLINE = "Tell Sync what's on your mind and this fills in.";
export const APP_IN_SYNC = "In Sync";

export const REFLECTION_ONGOING_WORK = "You're in a work block right now.";
export const REFLECTION_SPENT_SYNC_WORK = "You spent part of today on Sync work.";
export const REFLECTION_SPENT_WORKING = "You spent part of today working.";
export const REFLECTION_HEALTH_TODAY = "You made time for health today.";
export const REFLECTION_FAMILY_TODAY = "You made time for family today.";
export const REFLECTION_EMOTIONAL_TODAY = "Today carried an emotional note.";
export const REFLECTION_FULL_TODAY = "Today has been full.";
export const REFLECTION_MONEY_TODAY = "Money showed up today.";
export const REFLECTION_QUIET_TODAY = "Today has been quiet.";
export const REFLECTION_LEARNING = "Sync is still learning today.";

export const OBSERVATION_WORK_WEEK = "Work has anchored most of this week.";
export const OBSERVATION_HEALTH_RECENT = "You've been making time for health.";
export const OBSERVATION_MONEY_THEME = "Money has been a recurring theme lately.";
export const OBSERVATION_FAMILY_RECENT = "Family has needed your attention recently.";
export const OBSERVATION_RELATIONSHIPS_RECENT =
  "Relationships have been showing up often lately.";
export const OBSERVATION_COFFEE_ROUTINE = "Coffee has become part of your routine.";
export const OBSERVATION_QUIET_WEEK = "This week has been lighter than usual.";

export const CAPTURE_UNDERSTOOD = "Understood";
export const CAPTURE_PREVIEW_QUIET = "Sync will keep this quietly.";
export const CAPTURE_PREVIEW_WELLBEING = "Sync will keep this as a personal wellbeing note.";
export const CAPTURE_PREVIEW_WORTH_VIEW = "Worth keeping in view.";
export const CAPTURE_REMEMBERED = "Remembered.";

export const CONTEXT_PAYDAY_BEFORE_RENT = "Payday lands before rent is due.";
export const CONTEXT_PAYDAY_BEFORE_FLIGHT = "Payday lands before your flight.";
export const CONTEXT_EMOTION_STRESS_PATTERN =
  "You've mentioned stress a few times recently.";
export const CONTEXT_EMOTION_NOTED_TODAY = "Emotional check-in noted today.";

export const FORECAST_SHARPEN = "Tell Sync what happened and this will get sharper.";
export const FORECAST_MONEY_BEFORE_RENT = "Money lands before rent is due.";
export const FORECAST_TOMORROW_MORNING_PACKED = "Tomorrow morning is packed.";
export const FORECAST_TOMORROW_EARLY = "Tomorrow starts early.";
export const FORECAST_NOTHING_NEEDS_ATTENTION = HOME_NOTHING_NEEDS_ATTENTION;
export const FORECAST_SPACE_EVENING = "You have space this evening.";
export const FORECAST_QUIET_EVENING = "Tonight is quiet.";
export const FORECAST_PEOPLE_THIS_WEEK = "People matter more than logistics this week.";
export const FORECAST_WORK_ANCHORS = "Work anchors the next few days.";

export function FORECAST_QUIET_AFTER(timeLabel: string) {
  return `Tonight is quiet after ${timeLabel}.`;
}

export function formatShowsInDestinations(places: string[]): string {
  if (places.length === 0) return CAPTURE_PREVIEW_QUIET;
  if (places.length === 1) return `Shows in ${places[0]}.`;
  if (places.length === 2) return `Shows in ${places[0]} and ${places[1]}.`;
  return `Shows in ${places.slice(0, -1).join(", ")}, and ${places.at(-1)}.`;
}

export function formatPreviewDestinationDetail(
  places: string[],
  options?: { quiet?: boolean; wellbeing?: boolean; worthView?: boolean },
): string {
  if (options?.wellbeing) return CAPTURE_PREVIEW_WELLBEING;
  if (options?.worthView) return CAPTURE_PREVIEW_WORTH_VIEW;
  if (options?.quiet) return CAPTURE_PREVIEW_QUIET;
  return formatShowsInDestinations(places);
}
export const DRILLDOWN_BACK = "Today";
export const MY_LIFE_TITLE = "My Life";
export const MY_LIFE_LEDE = "What Sync is holding.";
export const MY_LIFE_EMPTY = "Tell Sync more and this fills itself in.";
export const MY_LIFE_BACK = "Today";
export const LIFE_TIMELINE_TITLE = "Life Timeline";
export const LIFE_TIMELINE_BACK = "My Life";
export const LIFE_AREA_BACK = "My Life";

export const CAPTURE_VAGUE =
  "Say what happened, or what's coming — even in a few words.";
export const CAPTURE_DUPLICATE = "I already have that one.";
export const CAPTURE_ALREADY_REMEMBERED = "Already remembered.";
export const CAPTURE_VIEW_EXISTING = "View Existing";
export const CAPTURE_SAVE_ANYWAY = "Save Anyway";
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
export const MEMORY_CONNECTED_HEADING = "Connected in your life";
export const MEMORY_EDIT_HEADING = "Correct this";
export const MEMORY_EDIT_SAVE = "Save";
export const MEMORY_EDIT_CANCEL = "Cancel";
export const MEMORY_EDIT_ACTION = "Correct";
export const MEMORY_REMOVE_ACTION = "Let this go";

export const MEMORY_LABEL_WEIGHT = "Weight";
export const MEMORY_LABEL_TYPE = "Type";
export const MEMORY_LABEL_AREA = "Lives in";
export const MEMORY_LABEL_TIME_RELEVANCE = "Timing";
export const MEMORY_LABEL_CONFIDENCE = "Confidence";
export const MEMORY_LABEL_PATTERN = "Builds toward";
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
