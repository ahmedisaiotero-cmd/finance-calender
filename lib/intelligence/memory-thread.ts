import type { CapturedSyncItem } from "@/lib/captured-items";
import type { MemoryProfile } from "@/lib/intelligence/memory-profile";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";

export type MemoryThread =
  | "emotional"
  | "spending"
  | "family"
  | "routine"
  | "relationship"
  | "health";

export function resolveMemoryThread(
  profile: MemoryProfile,
  text: string,
): MemoryThread | null {
  if (profile.accumulation === "emotional" || profile.type === "emotion") {
    return "emotional";
  }
  if (profile.accumulation === "spending" || profile.type === "expense") {
    return "spending";
  }
  if (
    profile.accumulation === "relationship" ||
    profile.area === "Relationships" ||
    /\b(birthday|anniversary|partner|girlfriend|boyfriend)\b/i.test(text)
  ) {
    return "relationship";
  }
  if (
    profile.area === "Family" ||
    /\b(mom|dad|daughter|son|mother|father)\b/i.test(text)
  ) {
    return "family";
  }
  if (profile.accumulation === "routine" || profile.area === "Work") {
    return "routine";
  }
  if (profile.area === "Health" || profile.type === "log" && profile.area === "Health") {
    return "health";
  }
  if (profile.accumulation === "habit") {
    return "health";
  }
  return null;
}

function memoryText(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  return `${item.title} ${normalizeCaptureInput(prompt).normalized}`.toLowerCase();
}

export function itemsInSameThread(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): CapturedSyncItem[] {
  const profile = buildMemoryProfile(item, reference);
  const text = memoryText(item);
  const thread = resolveMemoryThread(profile, text);
  if (!thread) return [];

  return items.filter((candidate) => {
    if (candidate.id === item.id) return false;
    if (candidate.status === "cancelled" || candidate.deletedAt) return false;
    const candidateProfile = buildMemoryProfile(candidate, reference);
    const candidateText = memoryText(candidate);
    return resolveMemoryThread(candidateProfile, candidateText) === thread;
  });
}

function daysSince(iso: string, reference: Date) {
  const created = new Date(iso);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  created.setHours(12, 0, 0, 0);
  return Math.round((start.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildThreadPatternInsight(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): string | null {
  const profile = buildMemoryProfile(item, reference);
  const text = memoryText(item);
  const thread = resolveMemoryThread(profile, text);
  if (!thread) return null;

  const siblings = itemsInSameThread(item, items, reference);
  const recent = [item, ...siblings].filter(
    (entry) => daysSince(entry.createdAt, reference) <= 30,
  );

  if (thread === "emotional") {
    const stressCount = recent.filter((entry) =>
      /\b(sad|upset|anxious|stressed|depressed|lonely|overwhelmed)\b/i.test(
        memoryText(entry),
      ),
    ).length;
    if (stressCount >= 3) {
      return "You've mentioned stress a few times recently.";
    }
    if (recent.length >= 2) {
      return "This connects to other moments you've shared about how you've been feeling.";
    }
    return null;
  }

  if (thread === "spending") {
    if (recent.length >= 4) {
      return "Small purchases are starting to form a spending pattern.";
    }
    return null;
  }

  if (thread === "health" && profile.type === "habit") {
    const coffeeCount = recent.filter((entry) =>
      /\bcoffee\b/i.test(memoryText(entry)),
    ).length;
    if (coffeeCount >= 3) {
      return "You usually buy coffee a few times a week.";
    }
  }

  if (thread === "family" || thread === "relationship") {
    if (
      recent.length >= 2 &&
      (profile.area === "Family" || profile.area === "Relationships")
    ) {
      return "This sits alongside other family and relationship memories.";
    }
  }

  if (thread === "routine" && recent.length >= 2) {
    return "This fits a routine Sync is learning from your schedule.";
  }

  return null;
}
