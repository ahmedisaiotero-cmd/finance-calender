import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";

export type LifeNoteKind =
  | "concern"
  | "goal"
  | "preference"
  | "health_signal"
  | "family_context"
  | "idea"
  | "routine"
  | "financial_state"
  | "no_plan";

export type LifeNoteClassification = {
  kind: LifeNoteKind;
  normalized: string;
};

const CONCERN_PATTERN =
  /\b(worried|worry|concerned|nervous|anxious|anxious about|stressed about|tight|overwhelmed|dread|afraid)\b/i;
const GOAL_PATTERN =
  /\b(i want to|get better at|trying to|goal|working toward|improve|build up to|learn to)\b/i;
const PREFERENCE_PATTERN =
  /\b(i prefer|prefer|preference|i like|works better for me|best for me|rather)\b/i;
const HEALTH_SIGNAL_PATTERN =
  /\b(sleep was|slept|rough night|tired|exhausted|low energy|headache|migraine|sore|pain|symptom|felt sick|not feeling well)\b/i;
const FAMILY_CONTEXT_PATTERN =
  /\b(mom|dad|mother|father|parent|daughter|son|child|kids|family|grandma|grandpa)\b.*\b(needing|needs|help|support|care|struggling|has been|lately)\b/i;
const IDEA_PATTERN = /\b(idea|maybe|could|thinking about|thought:|note to self)\b/i;
const FINANCIAL_STATE_PATTERN =
  /\b(a lot of debt|lots of debt|in debt|comfortable for now|ok for now|okay for now)\b/i;
const NO_PLAN_PATTERN =
  /\b((don'?t|do not|does not|didn't|did not|no|not)\b.{0,24}\b(much\s+)?plans?|no current plan|nothing planned|no plans)\b/i;
const ROUTINE_PATTERN =
  /\b(daily|lately|usually|often|routine|habit|every morning|every night|most days)\b/i;

export function classifyLifeNote(input: string): LifeNoteClassification | null {
  const normalized = normalizeCaptureInput(input).normalized;

  if (CONCERN_PATTERN.test(normalized)) return { kind: "concern", normalized };
  if (PREFERENCE_PATTERN.test(normalized)) return { kind: "preference", normalized };
  if (HEALTH_SIGNAL_PATTERN.test(normalized)) return { kind: "health_signal", normalized };
  if (FAMILY_CONTEXT_PATTERN.test(normalized)) return { kind: "family_context", normalized };
  if (IDEA_PATTERN.test(normalized)) return { kind: "idea", normalized };
  if (GOAL_PATTERN.test(normalized)) return { kind: "goal", normalized };
  if (FINANCIAL_STATE_PATTERN.test(normalized)) {
    return { kind: "financial_state", normalized };
  }
  if (NO_PLAN_PATTERN.test(normalized)) {
    return { kind: "no_plan", normalized };
  }
  if (ROUTINE_PATTERN.test(normalized)) return { kind: "routine", normalized };

  return null;
}

export function isNonCalendarLifeNote(input: string) {
  return classifyLifeNote(input) != null;
}
