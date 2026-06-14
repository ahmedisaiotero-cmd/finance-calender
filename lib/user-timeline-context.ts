import type { UserTimelineContext } from "@/lib/timeline/resolve-timeline";

export const USER_TIMELINE_CONTEXT_KEY = "sync.userTimelineContext";

export type PersistedWorkSchedule = {
  days: string[];
  startTime: string;
  endTime: string;
  recurrence: {
    frequency: "weekly";
    interval: 1;
    startsOn: string;
    endsOn: null;
  };
  status: "active" | "paused" | "deleted";
  sourceItemId?: string;
};

export type StoredUserTimelineContext = {
  workSchedule?: PersistedWorkSchedule;
};

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function dayNameToCode(day: string): string {
  const index = DAY_NAMES.findIndex(
    (name) => name.toLowerCase() === day.toLowerCase(),
  );
  return index >= 0 ? DAY_CODES[index] : day.slice(0, 2).toUpperCase();
}

export function dayCodeToName(code: string): string {
  const index = DAY_CODES.indexOf(code.toUpperCase() as (typeof DAY_CODES)[number]);
  return index >= 0 ? DAY_NAMES[index] : code;
}

export function normalizeScheduleDays(days: string[]): string[] {
  return [...new Set(days.map(dayNameToCode))];
}

export function dayMatchesScheduleDay(
  weekdayIndex: number,
  scheduleDays: string[],
): boolean {
  const code = DAY_CODES[weekdayIndex];
  const name = DAY_NAMES[weekdayIndex];
  return scheduleDays.some(
    (day) =>
      day.toUpperCase() === code ||
      day.toLowerCase() === name.toLowerCase(),
  );
}

function readStorage(): StoredUserTimelineContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_TIMELINE_CONTEXT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredUserTimelineContext;
  } catch {
    return {};
  }
}

function writeStorage(context: StoredUserTimelineContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    USER_TIMELINE_CONTEXT_KEY,
    JSON.stringify(context),
  );
}

export function loadUserTimelineContext(): StoredUserTimelineContext {
  return readStorage();
}

export function loadActiveWorkSchedule(): PersistedWorkSchedule | undefined {
  const schedule = readStorage().workSchedule;
  if (!schedule || schedule.status !== "active") return undefined;
  return schedule;
}

export function toResolveTimelineContext(
  stored: StoredUserTimelineContext = readStorage(),
): UserTimelineContext {
  const schedule = stored.workSchedule;
  if (!schedule || schedule.status !== "active") return {};
  return {
    workSchedule: {
      days: schedule.days,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    },
  };
}

export function saveWorkSchedule(
  schedule: Omit<PersistedWorkSchedule, "status" | "recurrence"> & {
    recurrence?: PersistedWorkSchedule["recurrence"];
    status?: PersistedWorkSchedule["status"];
    sourceItemId?: string;
  },
): PersistedWorkSchedule {
  const stored = readStorage();
  const next: PersistedWorkSchedule = {
    days: normalizeScheduleDays(schedule.days),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    recurrence: schedule.recurrence ?? {
      frequency: "weekly",
      interval: 1,
      startsOn: new Date().toISOString().slice(0, 10),
      endsOn: null,
    },
    status: schedule.status ?? "active",
    sourceItemId: schedule.sourceItemId,
  };
  writeStorage({ ...stored, workSchedule: next });
  return next;
}

export function deactivateWorkSchedule(): PersistedWorkSchedule | null {
  const stored = readStorage();
  if (!stored.workSchedule) return null;
  const next = { ...stored.workSchedule, status: "paused" as const };
  writeStorage({ ...stored, workSchedule: next });
  return next;
}

export function deleteWorkSchedule(): boolean {
  const stored = readStorage();
  if (!stored.workSchedule) return false;
  writeStorage({
    ...stored,
    workSchedule: { ...stored.workSchedule, status: "deleted" },
  });
  return true;
}
