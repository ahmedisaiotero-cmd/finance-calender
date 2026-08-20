import type { CapturedSyncItem } from "@/lib/captured-items";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";

export type PersonRelationshipType =
  | "family"
  | "relationship"
  | "friend"
  | "personal";

export type ExtractedPerson = {
  key: string;
  label: string;
  relationshipType: PersonRelationshipType;
};

const FAMILY_LABELS: Record<string, string> = {
  mom: "Mom",
  mother: "Mom",
  mama: "Mom",
  dad: "Dad",
  father: "Dad",
  daughter: "Daughter",
  son: "Son",
  sister: "Sister",
  brother: "Brother",
  grandma: "Grandma",
  grandpa: "Grandpa",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  girlfriend: "Girlfriend",
  boyfriend: "Boyfriend",
  wife: "Wife",
  husband: "Husband",
  partner: "Partner",
  fiance: "Fiancé",
  fiancee: "Fiancée",
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/['']/g, "'");
}

export function extractPersonFromMemory(
  item: CapturedSyncItem,
): ExtractedPerson | null {
  const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
  const title = displayMemoryTitle(item).toLowerCase();

  const takeChild = prompt.match(/\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/);
  if (takeChild?.[1]) {
    const key = takeChild[1];
    return {
      key,
      label: FAMILY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      relationshipType: "family",
    };
  }

  for (const [key, label] of Object.entries(FAMILY_LABELS)) {
    if (
      new RegExp(`\\bmy\\s+${key}\\b`).test(prompt) ||
      new RegExp(`\\b${key}'s\\b`).test(prompt) ||
      new RegExp(`\\b${key}'s\\b`).test(title)
    ) {
      return { key, label, relationshipType: "family" };
    }
  }

  for (const [key, label] of Object.entries(RELATIONSHIP_LABELS)) {
    if (
      new RegExp(`\\bmy\\s+${key}\\b`).test(prompt) ||
      new RegExp(`\\b${key}'s\\b`).test(prompt)
    ) {
      return { key, label, relationshipType: "relationship" };
    }
  }

  const friendMatch =
    prompt.match(/\bmy\s+(best\s+)?friend(?:'s)?\b/) ||
    prompt.match(/\bfriend(?:'s)?\s+birthday\b/) ||
    title.match(/^friend's birthday$/);
  if (friendMatch) {
    return { key: "friend", label: "Friend", relationshipType: "friend" };
  }

  const namedPerson = prompt.match(
    /\b(?:call|text|send|pay|give|met with|meet with)\s+([a-z][a-z' -]{1,24})\b/,
  );
  if (namedPerson?.[1]) {
    const raw = namedPerson[1].trim();
    const key = normalizeKey(raw);
    if (!/\b(her|him|them|money|rent|cash)\b/.test(key)) {
      const label = raw
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return { key, label, relationshipType: "personal" };
    }
  }

  if (item.destinations.includes("Family")) {
    return { key: "family", label: "Family", relationshipType: "family" };
  }

  if (item.destinations.includes("Relationships")) {
    return { key: "relationship", label: "Relationship", relationshipType: "relationship" };
  }

  return null;
}

export function formatRelatedPersonLabel(person: ExtractedPerson): string {
  return person.label;
}
