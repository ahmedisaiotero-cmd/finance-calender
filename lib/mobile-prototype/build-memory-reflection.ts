import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { buildThreadPatternInsight } from "@/lib/intelligence/memory-thread";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import type { MemoryWeight } from "@/lib/intelligence/memory-weight";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { formatRecurrenceLabel } from "@/lib/timeline/next-occurrence";

export type RelatedMemoryView = {
  id: string;
  title: string;
};

export type MemoryReflectionView = {
  id: string;
  title: string;
  worthLine: string;
  whenLine: string | null;
  contextLine: string;
  patternLine: string | null;
  understoodLine: string;
  originalInput: string;
  connectedMemories: RelatedMemoryView[];
};

function formatDateKeyLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function formatMemoryWhen(item: CapturedSyncItem, reference: Date) {
  const key = resolveCaptureDateKey(item, reference);
  if (!key) {
    return item.dateLabel !== "Flexible" ? item.dateLabel : null;
  }
  return formatDateKeyLabel(key);
}

function worthLineForWeight(weight: MemoryWeight): string {
  switch (weight) {
    case "critical":
      return "Needs your attention soon.";
    case "meaningful":
      return "Worth remembering.";
    case "important":
      return "Worth keeping in mind.";
    default:
      return "A small note from daily life.";
  }
}

function contextLineForMemory(
  item: CapturedSyncItem,
  profile: ReturnType<typeof buildMemoryProfile>,
): string {
  if (profile.accumulation === "relationship" || profile.area === "Family") {
    return "Family memories tend to matter longer.";
  }
  if (profile.area === "Relationships") {
    return "Relationship moments stay close over time.";
  }
  if (profile.accumulation === "emotional" || profile.type === "emotion") {
    return "How you feel over time helps Sync understand your season.";
  }
  if (profile.accumulation === "spending" || profile.type === "expense") {
    return "Small purchases add up as Sync learns your rhythms.";
  }
  if (profile.accumulation === "habit" || profile.type === "habit") {
    return "Daily habits become clearer as they repeat.";
  }
  if (profile.accumulation === "routine" || profile.area === "Work") {
    return "Part of the routine Sync is learning from your life.";
  }
  if (profile.type === "income" || /\b(payday|rent|bill)\b/i.test(item.prompt)) {
    return "Money timing shapes what Sync surfaces for you.";
  }
  if (profile.type === "commitment") {
    return "Commitments like this shape what matters next.";
  }
  return "Sync holds this so it can connect to what comes next.";
}

function whenLineForMemory(item: CapturedSyncItem, reference: Date): string | null {
  const appears = formatMemoryWhen(item, reference);
  if (!appears || appears === "—") return null;

  const recurrence = formatRecurrenceLabel(item.timeline);
  if (recurrence) {
    return `${appears}. ${recurrence}.`;
  }

  return `${appears}.`;
}

export function buildMemoryReflection(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): MemoryReflectionView {
  const profile = buildMemoryProfile(item, reference);
  const weight = effectiveMemoryWeight(item, items, reference);

  return {
    id: item.id,
    title: displayMemoryTitle(item),
    worthLine: worthLineForWeight(weight),
    whenLine: whenLineForMemory(item, reference),
    contextLine: contextLineForMemory(item, profile),
    patternLine: buildThreadPatternInsight(item, items, reference),
    understoodLine: resolveMemoryUnderstanding(item, reference),
    originalInput: item.originalPrompt ?? item.prompt,
    connectedMemories: items
      .filter(
        (candidate) =>
          candidate.id !== item.id &&
          !candidate.deletedAt &&
          candidate.status !== "cancelled" &&
          buildMemoryProfile(candidate, reference).accumulation ===
            profile.accumulation &&
          profile.accumulation != null,
      )
      .slice(0, 4)
      .map((candidate) => ({
        id: candidate.id,
        title: displayMemoryTitle(candidate),
      })),
  };
}
