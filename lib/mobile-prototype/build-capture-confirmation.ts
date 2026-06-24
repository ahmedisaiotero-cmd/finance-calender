import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDrilldownForConsequence,
  type LifeDrilldownTarget,
} from "@/lib/intelligence/consequence-link";
import { formatItemTimePhrase } from "@/lib/intelligence/consequence-timing";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { CAPTURE_REMEMBERED } from "@/lib/mobile-prototype/sync-voice";

export type CaptureConfirmation = {
  headline: string;
  line: string;
  detail: string | null;
  target: LifeDrilldownTarget | null;
};

function areaDrilldownTarget(
  area: ReturnType<typeof buildMemoryProfile>["area"],
): LifeDrilldownTarget {
  const kind =
    area === "Money"
      ? "money"
      : area === "Family"
        ? "family"
        : area === "Relationships"
          ? "relationship"
          : area === "Health"
            ? "health"
            : area === "Work"
              ? "work"
              : "day";

  return {
    id: `capture-confirm-${area.toLowerCase()}`,
    kind,
    label: area,
    area,
    confidence: "high",
  };
}

export function buildCaptureConfirmation(
  item: CapturedSyncItem,
  options?: {
    reference?: Date;
    consequences?: SyncConsequence[];
  },
): CaptureConfirmation {
  const reference = options?.reference ?? new Date();
  const consequences =
    options?.consequences ??
    buildAllConsequences({ items: [item], reference }).filter(
      (consequence) => consequence.sourceMemoryId === item.id,
    );

  const profile = buildMemoryProfile(item, reference);
  const area = profile.area === "Calendar" ? "Personal" : profile.area;
  const timePhrase = formatItemTimePhrase(item, reference);
  const title = displayMemoryTitle(item);

  const matchingConsequence = consequences.find(
    (consequence) => consequence.sourceMemoryId === item.id,
  );

  let target: LifeDrilldownTarget | null = null;
  if (matchingConsequence) {
    target = buildDrilldownForConsequence(matchingConsequence, [item], reference);
  } else if (area !== "Personal") {
    target = areaDrilldownTarget(area);
  } else if (timePhrase) {
    target = {
      id: "capture-confirm-timeline",
      kind: "timeline",
      label: "Life Timeline",
      confidence: "high",
    };
  }

  const areaLabel = area === "Personal" ? "Sync" : area;
  const line = timePhrase
    ? `${areaLabel} · ${timePhrase}`
    : `${areaLabel} · ${title}`;

  const detail =
    profile.type === "emotion"
      ? resolveMemoryUnderstanding(item, reference)
      : timePhrase
        ? "This will show in Life Timeline."
        : "Saved where Sync can use it.";

  return {
    headline: CAPTURE_REMEMBERED,
    line,
    detail,
    target,
  };
}
