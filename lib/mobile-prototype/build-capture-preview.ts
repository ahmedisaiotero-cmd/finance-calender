import type { CapturedSyncItem } from "@/lib/captured-items";
import { formatItemTimePhrase } from "@/lib/intelligence/consequence-timing";
import {
  buildMemoryProfile,
  type MemoryArea,
  type MemoryConfidence,
  type MemoryProfile,
} from "@/lib/intelligence/memory-profile";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import {
  formatPreviewDestinationDetail,
} from "@/lib/mobile-prototype/sync-voice";
import type { PreparedCapture } from "@/lib/sync-capture/save-capture";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { isMoneyLanguage } from "@/lib/sync-capture/surface-copy";

export type CapturePreview = {
  title: string;
  areaLine: string;
  detail: string;
  confidence: MemoryConfidence;
  destinations: string[];
};

function stubItemFromPrepared(prepared: PreparedCapture): CapturedSyncItem {
  const { plan, destinations, title } = prepared;
  return {
    id: plan.id,
    title,
    category: plan.category,
    prompt: plan.prompt,
    originalPrompt: plan.originalPrompt,
    destinations,
    dateLabel: plan.dateLabel,
    timeLabel: plan.timeLabel,
    timeline: plan.timeline,
    workAvailability: plan.parsedInput?.workAvailability,
    moneyType: plan.parsedInput?.moneyType,
    parsedInput: plan.parsedInput,
    status: "active",
    createdAt: plan.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function formatAreaTimingPhrase(
  item: CapturedSyncItem,
  reference: Date,
): string | null {
  const timed = formatItemTimePhrase(item, reference);
  if (timed) return timed;

  const profile = buildMemoryProfile(item, reference);
  const dateKey = item.timeline?.startDate ?? item.timeline?.deadlineDate;
  if (!dateKey) {
    if (profile.timeRelevance === "today") return "Today";
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (profile.timeRelevance === "today") return "Today";
  if (profile.timeRelevance === "tomorrow") return "Tomorrow";
  if (profile.timeRelevance === "this_week" || profile.timeRelevance === "later") {
    return weekday;
  }

  return null;
}

function displayArea(profile: MemoryProfile): MemoryArea {
  if (profile.area === "Calendar") return "Personal";
  return profile.area;
}

function previewDestinations(
  area: MemoryArea,
  profile: MemoryProfile,
  item: CapturedSyncItem,
): string[] {
  const display = displayArea(profile);
  const places: string[] = [display];

  const hasTiming =
    profile.timeRelevance !== "none" &&
    profile.timeRelevance !== "past" &&
    Boolean(item.timeline?.startDate || item.timeline?.deadlineDate || item.timeline?.startTime);

  if (display !== "Personal" && (hasTiming || profile.type !== "note")) {
    if (!places.includes("Life Timeline")) {
      places.push("Life Timeline");
    }
  }

  return places;
}

export function buildPreviewDestinationDetail(
  area: MemoryArea,
  profile: MemoryProfile,
  item: CapturedSyncItem,
): string {
  const places = previewDestinations(area, profile, item);

  if (profile.type === "emotion") {
    return formatPreviewDestinationDetail(places, {
      wellbeing: profile.confidence === "low",
      worthView: profile.confidence !== "low",
    });
  }

  const display = displayArea(profile);

  if (display === "Personal" || profile.confidence === "low") {
    return formatPreviewDestinationDetail(places, { quiet: true });
  }

  if (profile.type === "habit" || profile.type === "meal") {
    if (display === "Health" || memoryFilterCategory(item) === "Health") {
      return formatPreviewDestinationDetail(places, { quiet: true });
    }
  }

  return formatPreviewDestinationDetail(places);
}

function resolvePreviewTitle(
  item: CapturedSyncItem,
  profile: MemoryProfile,
): string {
  const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();

  if (/\brent\b/.test(prompt) && /\b(due|pay)\b/.test(prompt)) {
    return "Rent";
  }

  if (
    isMoneyLanguage(prompt) &&
    profile.area === "Money" &&
    !/\b(payday|paycheck|rent due|get paid)\b/i.test(prompt)
  ) {
    return "Small money note";
  }

  if (profile.confidence === "low" && profile.type === "note") {
    return "Personal note";
  }

  if (profile.type === "emotion") {
    return "Emotional check-in";
  }

  return displayMemoryTitle(item);
}

export function buildCapturePreviewFromItem(
  item: CapturedSyncItem,
  reference = new Date(),
): CapturePreview {
  const profile = buildMemoryProfile(item, reference);
  const area = displayArea(profile);
  const timing = formatAreaTimingPhrase(item, reference);
  const title = resolvePreviewTitle(item, profile);
  const areaLine = timing ? `${area} · ${timing}` : area;

  return {
    title,
    areaLine,
    detail: buildPreviewDestinationDetail(area, profile, item),
    confidence: profile.confidence,
    destinations: previewDestinations(area, profile, item),
  };
}

export function buildCapturePreview(
  prepared: PreparedCapture,
  reference = new Date(),
): CapturePreview {
  return buildCapturePreviewFromItem(stubItemFromPrepared(prepared), reference);
}

export function itemSnapshotFromPrepared(
  prepared: PreparedCapture,
  sourceMeta?: {
    captureSource?: CapturedSyncItem["captureSource"];
    voiceTranscript?: string;
  },
): CapturedSyncItem {
  const item = stubItemFromPrepared(prepared);
  return {
    ...item,
    captureSource: sourceMeta?.captureSource ?? "typed",
    voiceTranscript: sourceMeta?.voiceTranscript,
  };
}
