import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncLens } from "@/components/sync/sync-life-stream";

export type LensHeading = {
  title: string;
  subtitle: string;
};

export const LENS_HEADINGS: Record<SyncLens, LensHeading> = {
  all: {
    title: "All",
    subtitle: "Everything Sync is holding for you.",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Upcoming moments on your timeline.",
  },
  finance: {
    title: "Finance",
    subtitle: "Money signals worth keeping in view.",
  },
  health: {
    title: "Health",
    subtitle: "Movement, recovery, and wellness.",
  },
  work: {
    title: "Work",
    subtitle: "Your work blocks and logged shifts.",
  },
  relationships: {
    title: "Relationships",
    subtitle: "Upcoming connection points.",
  },
  goals: {
    title: "Goals",
    subtitle: "Projects and intentions you asked Sync to hold.",
  },
  school: {
    title: "School",
    subtitle: "Classes, assignments, and academic deadlines.",
  },
};

const LENS_DESTINATION: Partial<
  Record<SyncLens, CapturedSyncItem["destinations"][number]>
> = {
  calendar: "Calendar",
  finance: "Finance",
  health: "Health",
  work: "Work",
  relationships: "Relationships",
  goals: "Goals",
  school: "School",
};

function filterByLens(items: CapturedSyncItem[], lens: SyncLens) {
  if (lens === "all") {
    return items.filter((item) => item.status !== "cancelled" && !item.deletedAt);
  }
  const destination = LENS_DESTINATION[lens];
  if (!destination) return items;
  return items.filter(
    (item) =>
      item.status !== "cancelled" &&
      !item.deletedAt &&
      item.destinations.includes(destination),
  );
}

export function lensItemCount(items: CapturedSyncItem[], lens: SyncLens) {
  return filterByLens(items, lens).length;
}

export function lensSummaryLine(items: CapturedSyncItem[], lens: SyncLens) {
  const filtered = filterByLens(items, lens);
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort((a, b) => {
    const aKey =
      a.timeline?.deadlineDate ?? a.timeline?.startDate ?? a.createdAt;
    const bKey =
      b.timeline?.deadlineDate ?? b.timeline?.startDate ?? b.createdAt;
    return aKey.localeCompare(bKey);
  });

  const next = sorted[0];
  const when = [next.dateLabel, next.timeLabel]
    .filter((value) => value && value !== "Flexible" && value !== "Upcoming")
    .join(" · ");

  if (when) return `${when} — ${next.title}`;
  return next.title;
}
