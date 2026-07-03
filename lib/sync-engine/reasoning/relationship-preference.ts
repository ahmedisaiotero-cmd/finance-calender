import type { PreparedCapture } from "@/lib/sync-capture/save-capture";

export type RelationshipPreferenceDetection = {
  detected: boolean;
  area: "Family" | "Relationships" | null;
  reason: string;
};

const FAMILY_PEOPLE =
  /\b(mom|mother|dad|father|brother|sister|son|daughter|grandma|grandpa|parent)\b/i;
const RELATIONSHIP_PEOPLE =
  /\b(girlfriend|boyfriend|partner|wife|husband|spouse|friend)\b/i;
const PREFERENCE_VERBS =
  /\b(likes?|loves?|hates?|prefers?|doesn'?t like|does not like|avoids?)\b/i;

export function detectRelationshipPreference(
  text: string,
): RelationshipPreferenceDetection {
  const normalized = text.trim();
  if (!normalized) {
    return { detected: false, area: null, reason: "Input is empty." };
  }

  if (!PREFERENCE_VERBS.test(normalized)) {
    return {
      detected: false,
      area: null,
      reason: "No preference signal found.",
    };
  }

  if (FAMILY_PEOPLE.test(normalized)) {
    return {
      detected: true,
      area: "Family",
      reason: "Family preference memory detected.",
    };
  }
  if (RELATIONSHIP_PEOPLE.test(normalized)) {
    return {
      detected: true,
      area: "Relationships",
      reason: "Relationship preference memory detected.",
    };
  }

  return {
    detected: false,
    area: null,
    reason: "Preference exists but person relationship is unclear.",
  };
}

export function applyRelationshipPreferenceContext(
  prepared: PreparedCapture,
  detection: RelationshipPreferenceDetection,
) {
  if (!detection.detected || !detection.area) return;
  if (!prepared.destinations.includes(detection.area)) {
    prepared.destinations = [...prepared.destinations, detection.area];
  }
}
