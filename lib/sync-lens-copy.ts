import type { SyncWorkspaceLens } from "@/lib/sync-lenses";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { toDateKey } from "@/lib/calendar-utils";
import {
  formatSyncTimeBlockRange,
  formatWorkScheduleDaysLabel,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type LensHeading = {
  title: string;
  subtitle: string;
};

export const LENS_HEADINGS: Record<SyncWorkspaceLens, LensHeading> = {
  home: {
    title: "Home",
    subtitle: "How to approach today.",
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
  family: {
    title: "Family",
    subtitle: "Important family commitments.",
  },
};

const LENS_DESTINATION: Partial<
  Record<SyncWorkspaceLens, CapturedSyncItem["destinations"][number]>
> = {
  calendar: "Calendar",
  finance: "Finance",
  health: "Health",
  work: "Work",
  relationships: "Relationships",
  goals: "Goals",
  school: "School",
  family: "Family",
};

function filterByLens(items: CapturedSyncItem[], lens: SyncWorkspaceLens) {
  if (lens === "home") {
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

export function lensItemCount(items: CapturedSyncItem[], lens: SyncWorkspaceLens) {
  return filterByLens(items, lens).length;
}

function friendlyDayLabel(dateKey: string, reference: Date) {
  const today = toDateKey(reference);
  const tomorrow = toDateKey(
    new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1),
  );
  if (dateKey === today) return "Today";
  if (dateKey === tomorrow) return "Tomorrow";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function formatItemWhen(item: CapturedSyncItem) {
  const time =
    item.timeline?.startTime && item.timeline?.endTime
      ? `${formatClock(item.timeline.startTime)}–${formatClock(item.timeline.endTime)}`
      : item.timeline?.startTime
        ? formatClock(item.timeline.startTime)
        : item.timeLabel && item.timeLabel !== "Flexible"
          ? item.timeLabel
          : null;

  const date =
    item.dateLabel && item.dateLabel !== "Upcoming" && item.dateLabel !== "Flexible"
      ? item.dateLabel
      : null;

  if (date && time) return `${date} · ${time}`;
  return date ?? time ?? null;
}

function formatClock(value: string) {
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

export function lensNextLine(
  items: CapturedSyncItem[],
  lens: SyncWorkspaceLens,
  workBlocks: SyncTimeBlock[] = [],
  reference = new Date(),
): string | null {
  if (lens === "work" && workBlocks.length > 0) {
    const todayKey = toDateKey(reference);
    const upcoming = workBlocks
      .filter((block) => block.isTimed && block.date >= todayKey)
      .sort((a, b) => {
        const aKey = `${a.date}T${a.startTime ?? "00:00"}`;
        const bKey = `${b.date}T${b.startTime ?? "00:00"}`;
        return aKey.localeCompare(bKey);
      });

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const day = friendlyDayLabel(next.date, reference);
      const range = formatSyncTimeBlockRange(next);
      return `Next: ${day} · ${range}`;
    }
  }

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
  const when = formatItemWhen(next);
  if (when) return `Next: ${when}`;
  return `Next: ${next.title}`;
}

export function lensWorkScheduleLine(
  workSchedule: PersistedWorkSchedule | null | undefined,
): string | null {
  if (!workSchedule || workSchedule.status !== "active") return null;
  const days = formatWorkScheduleDaysLabel(workSchedule.days);
  const start = formatClock(workSchedule.startTime);
  const end = formatClock(workSchedule.endTime);
  return `Work Schedule · ${days} · ${start}–${end}`;
}

/** @deprecated Use lensNextLine */
export function lensSummaryLine(items: CapturedSyncItem[], lens: SyncWorkspaceLens) {
  return lensNextLine(items, lens);
}
