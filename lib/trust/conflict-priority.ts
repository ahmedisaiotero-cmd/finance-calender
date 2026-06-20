import type { CapturedSyncItem } from "@/lib/captured-items";
import type { MeaningImportance } from "@/lib/intelligence/meaning-engine";
import type {
  SyncTimeBlockArea,
  SyncTimeBlockOverlap,
  SyncTimeBlockType,
} from "@/lib/sync-time-blocks";

export type ConflictEntity = {
  importance: MeaningImportance;
  protected: boolean;
  blockType?: SyncTimeBlockType;
  area?: SyncTimeBlockArea;
  category?: string;
  title?: string;
  prompt?: string;
  destinations?: string[];
};

export type ConflictPriorityComparison = {
  proposedScore: number;
  existingScore: number;
  winner: "proposed" | "existing" | "equal";
};

const IMPORTANCE_SCORE: Record<MeaningImportance, number> = {
  critical: 500,
  high: 300,
  medium: 100,
  low: 10,
};

export function conflictPriorityScore(entity: ConflictEntity): number {
  let score = IMPORTANCE_SCORE[entity.importance] ?? 50;

  if (entity.protected) score += 1000;
  if (entity.blockType === "schedule") score += 80;
  if (entity.area === "work" || entity.area === "school") score += 60;
  if (entity.destinations?.includes("Family")) score += 40;
  if (entity.destinations?.includes("Health")) score += 30;

  return score;
}

export function compareConflictPriority(
  proposed: ConflictEntity,
  existing: ConflictEntity,
): ConflictPriorityComparison {
  const proposedScore = conflictPriorityScore(proposed);
  const existingScore = conflictPriorityScore(existing);

  let winner: ConflictPriorityComparison["winner"] = "equal";
  if (proposedScore > existingScore) winner = "proposed";
  if (existingScore > proposedScore) winner = "existing";

  return { proposedScore, existingScore, winner };
}

function entityFromCapture(
  item: CapturedSyncItem,
  importance: MeaningImportance = item.meaning?.importance ?? "medium",
): ConflictEntity {
  return {
    importance,
    protected: item.protectedTime?.enabled === true,
    blockType: item.timeline?.timelineRole === "schedule" ? "schedule" : "event",
    area: item.destinations.includes("Work")
      ? "work"
      : item.destinations.includes("School")
        ? "school"
        : item.destinations.includes("Family")
          ? "family"
          : item.destinations.includes("Health")
            ? "health"
            : "calendar",
    category: item.category,
    title: item.title,
    prompt: item.prompt,
    destinations: item.destinations,
  };
}

function entityFromOverlap(
  overlap: SyncTimeBlockOverlap,
  importance: MeaningImportance,
  protectedTime = false,
): ConflictEntity {
  return {
    importance,
    protected: protectedTime || overlap.existingProtected === true,
    blockType: overlap.existingArea === "work" ? "schedule" : "event",
    area: overlap.existingArea,
    title: overlap.existingTitle,
    prompt: overlap.existingTitle,
  };
}

function entityFromProposed(
  meaning: { importance: MeaningImportance },
  prompt: string,
  protectedTime = false,
  destinations: string[] = [],
): ConflictEntity {
  const importance = meaning.importance;
  return {
    importance,
    protected: protectedTime,
    blockType: "event",
    area: destinations.includes("Work")
      ? "work"
      : destinations.includes("Health")
        ? "health"
        : "calendar",
    prompt,
    destinations,
  };
}

export function buildPriorityConflictOverlap(
  overlap: SyncTimeBlockOverlap,
  proposed: {
    meaning: { importance: MeaningImportance };
    prompt: string;
    protectedTime?: boolean;
    destinations?: string[];
  },
  conflictItem?: CapturedSyncItem,
): SyncTimeBlockOverlap {
  const proposedEntity = entityFromProposed(
    proposed.meaning,
    proposed.prompt,
    proposed.protectedTime,
    proposed.destinations,
  );

  const existingEntity = conflictItem
    ? entityFromCapture(conflictItem)
    : entityFromOverlap(
        overlap,
        overlap.existingProtected ? "high" : overlap.existingArea === "work" ? "medium" : "medium",
        overlap.existingProtected,
      );

  const comparison = compareConflictPriority(proposedEntity, existingEntity);
  const isWork =
    overlap.existingTitle === "Work" ||
    overlap.existingArea === "work" ||
    conflictItem?.destinations.includes("Work");
  const isProtectedFamily =
    existingEntity.protected &&
    (existingEntity.destinations?.includes("Family") ||
      /\b(daughter|son|family|school event)\b/i.test(existingEntity.prompt ?? ""));

  if (comparison.winner === "existing" && existingEntity.protected) {
    const moveWhat =
      proposedEntity.importance === "low" ||
      /\b(groceries|grocery|errand)\b/i.test(proposed.prompt)
        ? `Consider moving ${proposedEntity.prompt?.match(/\b(groceries|grocery|errand|gym|workout)\b/i)?.[0] ?? "this"} instead.`
        : "Consider rescheduling around this protected time.";

    return {
      ...overlap,
      severity: "important",
      existingProtected: true,
      headline: isProtectedFamily
        ? "This overlaps with protected family time."
        : "This overlaps with protected time.",
      conflictMeaning: moveWhat,
    };
  }

  if (isWork && proposedEntity.importance === "high") {
    return {
      ...overlap,
      severity: "important",
      headline: "This overlaps with Work, but this looks important.",
      conflictMeaning:
        "You may need to protect this time or adjust work availability.",
    };
  }

  if (isWork && proposedEntity.importance === "medium" && /\b(gym|workout)\b/i.test(proposed.prompt)) {
    return {
      ...overlap,
      severity: "notice",
      headline: "This overlaps with Work.",
      conflictMeaning: "You may want to move the workout after work ends.",
    };
  }

  if (comparison.winner === "existing" && existingEntity.importance === "high") {
    return {
      ...overlap,
      severity: "important",
      headline: "This overlaps with something that looks important.",
      conflictMeaning: "This commitment may need priority. This could be moved later.",
    };
  }

  if (isWork) {
    return {
      ...overlap,
      severity: "notice",
      headline: "This overlaps with Work.",
      conflictMeaning:
        proposedEntity.importance === "low"
          ? "This could be moved later."
          : "You may want to adjust timing before saving.",
    };
  }

  if (existingEntity.protected) {
    return {
      ...overlap,
      severity: "important",
      existingProtected: true,
      headline: "This overlaps with protected time.",
      conflictMeaning: "Consider rescheduling.",
    };
  }

  return {
    ...overlap,
    severity: proposedEntity.importance === "high" ? "important" : "notice",
  };
}
