import { toDateKey } from "@/lib/calendar-utils";
import type { SyncTimeBlock } from "@/lib/sync-time-blocks";
import {
  formatSyncClock,
  formatSyncTimeBlockRange,
  syncTimeBlocksOverlap,
} from "@/lib/sync-time-blocks";

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function clockToMinutes(value?: string) {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function friendlyDayLabel(dateKey: string, reference: Date) {
  const today = toDateKey(reference);
  const tomorrow = toDateKey(addDays(reference, 1));
  if (dateKey === today) return "Today";
  if (dateKey === tomorrow) return "Tomorrow";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function timedBlocksForDate(blocks: SyncTimeBlock[], dateKey: string) {
  return blocks.filter(
    (block) => block.date === dateKey && block.isTimed && block.startTime,
  );
}

function occupiedMinutes(blocks: SyncTimeBlock[]) {
  return blocks.reduce((total, block) => {
    const start = clockToMinutes(block.startTime);
    const end =
      clockToMinutes(block.endTime) ??
      (start != null ? start + 60 : null);
    if (start == null || end == null) return total;
    const normalizedEnd = end <= start ? end + 24 * 60 : end;
    return total + (normalizedEnd - start);
  }, 0);
}

function latestBlockEnd(blocks: SyncTimeBlock[]) {
  let latest = 0;
  for (const block of blocks) {
    const end = clockToMinutes(block.endTime);
    if (end != null && end > latest) latest = end;
  }
  return latest;
}

function findInternalOverlap(blocks: SyncTimeBlock[]) {
  const timed = blocks.filter((block) => block.isTimed);
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      if (syncTimeBlocksOverlap(timed[i], timed[j])) {
        return { first: timed[i], second: timed[j] };
      }
    }
  }
  return null;
}

export function generateAmbientInsightFromBlocks(
  blocks: SyncTimeBlock[],
  reference = new Date(),
): string {
  const tomorrowKey = toDateKey(addDays(reference, 1));
  const tomorrowBlocks = timedBlocksForDate(blocks, tomorrowKey);
  const tomorrowOccupied = occupiedMinutes(tomorrowBlocks);

  if (tomorrowBlocks.length === 0 || tomorrowOccupied < 4 * 60) {
    return "Tomorrow is mostly open.";
  }

  const horizonKeys = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
    toDateKey(addDays(reference, offset)),
  );

  for (const dateKey of horizonKeys) {
    const dayBlocks = timedBlocksForDate(blocks, dateKey);
    if (dayBlocks.length >= 3) {
      return `${friendlyDayLabel(dateKey, reference)} is busy.`;
    }
  }

  for (const dateKey of horizonKeys) {
    const dayBlocks = blocks.filter((block) => block.date === dateKey);
    const overlap = findInternalOverlap(dayBlocks);
    if (overlap) {
      const protectedBlock =
        overlap.first.protected || overlap.second.protected
          ? overlap.first.protected
            ? overlap.first
            : overlap.second
          : null;
      if (protectedBlock) {
        return `${overlap.second.title === protectedBlock.title ? overlap.first.title : overlap.second.title} overlaps with protected time.`;
      }
      const existingLabel =
        overlap.first.title === "Work" ? "work" : overlap.first.title.toLowerCase();
      return `${overlap.second.title} overlaps with ${existingLabel}.`;
    }
  }

  const todayKey = toDateKey(reference);
  const todayBlocks = timedBlocksForDate(blocks, todayKey);
  const lastEnd = latestBlockEnd(todayBlocks);
  if (lastEnd > 0 && lastEnd < 22 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(lastEnd / 60)).padStart(2, "0")}:${String(lastEnd % 60).padStart(2, "0")}`,
    );
    if (openLabel) {
      return `You have open time after ${openLabel}.`;
    }
  }

  const nextBlock = [...blocks]
    .filter((block) => block.date >= todayKey && block.isTimed)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (nextBlock) {
    const when = friendlyDayLabel(nextBlock.date, reference);
    const time = formatSyncClock(nextBlock.startTime);
    return time
      ? `${when}: ${time} ${nextBlock.title}.`
      : `${when}: ${nextBlock.title}.`;
  }

  return "Nothing urgent right now.";
}

export function summarizeWorkLensSchedule(blocks: SyncTimeBlock[]) {
  const scheduleBlocks = blocks.filter((block) => block.blockType === "schedule");
  if (scheduleBlocks.length === 0) return null;

  const sample = scheduleBlocks[0];
  const loggedBlocks = blocks.filter((block) => block.blockType !== "schedule");

  return {
    title: "Work Schedule",
    daysLabel: "Weekly schedule",
    range: formatSyncTimeBlockRange(sample),
    hasLoggedShifts: loggedBlocks.length > 0,
    loggedBlocks,
    scheduleBlocks,
  };
}
