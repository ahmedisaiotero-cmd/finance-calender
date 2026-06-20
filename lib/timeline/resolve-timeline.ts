import { detectSyncCommandIntent } from "@/lib/sync-command-intent";
import { resolveTime, type ResolvedTime } from "@/lib/timeline/resolve-time";
import { dayMatchesScheduleDay } from "@/lib/user-timeline-context";

export type TimelineResolution = {
  kind: "single_date" | "date_range" | "recurring" | "relative" | "unknown";
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isTimed: boolean;
  durationMinutes?: number;
  deadlineDate?: string;
  deadlineTime?: string;
  timelineRole: "event" | "task" | "deadline" | "log" | "schedule";
  recurrence?: {
    frequency: "weekly" | "biweekly" | "monthly" | "yearly";
    days?: string[];
    dayOfMonth?: number;
    month?: number;
  };
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  needsConfirmation: boolean;
  tense: "past" | "present" | "future" | "unknown";
  label: string;
  sourceText: string;
  scheduleInferenceApplied: boolean;
  timeSource: "input" | "user_context" | "inferred" | "none";
};

export type UserTimelineContext = {
  workSchedule?: {
    days: string[];
    startTime: string;
    endTime: string;
  };
};

export type ResolveTimelineOptions = {
  now?: Date;
  userContext?: UserTimelineContext;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const DAY_PATTERN =
  "(sunday|monday|tuesday|wednesday|thursday|friday|saturday)";
const MONTH_PATTERN =
  "(january|february|march|april|may|june|july|august|september|october|november|december)";
const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDay(value: string) {
  const lower = value.toLowerCase();
  return DAY_NAMES.find((day) => day.toLowerCase() === lower) ?? null;
}

function dayIndex(day: string) {
  return DAY_NAMES.findIndex((item) => item.toLowerCase() === day.toLowerCase());
}

function dayCode(day: string) {
  return day.slice(0, 2).toUpperCase();
}

function daysBetween(startDay: string, endDay: string) {
  const start = dayIndex(startDay);
  const end = dayIndex(endDay);
  if (start < 0 || end < 0) return [];

  const days: string[] = [];
  let index = start;
  while (true) {
    days.push(DAY_NAMES[index]);
    if (index === end) break;
    index = (index + 1) % DAY_NAMES.length;
  }
  return days;
}

function formatWeeklyDaysLabel(days: string[]) {
  if (days.length === 0) return "Weekly";
  if (days.length === 1) return `Every ${days[0]}`;
  if (days.length === 2) return `Every ${days[0]} and ${days[1]}`;
  return `Every ${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}`;
}

export function isPastWorkLogLanguage(text: string) {
  return /\b(worked|had\s+work|did\s+work)\b/.test(text);
}

export function isStandingWorkScheduleLanguage(text: string) {
  if (isPastWorkLogLanguage(text)) return false;
  return (
    /\bmy\s+work\s+schedule\s+is\b/.test(text) ||
    /\bmy\s+schedule\s+is\b/.test(text) ||
    /\bi\s+usually\s+work\b/.test(text) ||
    /\bi\s+work\s+every\b/.test(text) ||
    /\bwork\s+schedule\b/.test(text) ||
    /\bmy\s+shifts?\s+are\b/.test(text) ||
    /\bi\s+work\b/.test(text)
  );
}

function weekdayIndexFromDateKey(dateKey?: string) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getDay();
}

function resolutionMatchesWorkSchedule(
  resolution: TimelineResolution,
  schedule: NonNullable<UserTimelineContext["workSchedule"]>,
) {
  if (resolution.kind === "date_range" && resolution.startDate) {
    const startIndex = weekdayIndexFromDateKey(resolution.startDate);
    const endIndex = weekdayIndexFromDateKey(resolution.endDate);
    if (startIndex == null || endIndex == null) return false;
    for (let index = startIndex; ; index = (index + 1) % 7) {
      if (dayMatchesScheduleDay(index, schedule.days)) return true;
      if (index === endIndex) break;
    }
    return false;
  }

  const index = weekdayIndexFromDateKey(resolution.startDate);
  if (index == null) return false;
  return dayMatchesScheduleDay(index, schedule.days);
}

function resolveStandingWorkSchedule(
  input: string,
  text: string,
  time: ResolvedTime,
): TimelineResolution | null {
  if (!isStandingWorkScheduleLanguage(text)) return null;

  const range = text.match(
    new RegExp(
      `${DAY_PATTERN}\\s+(?:through|thru|to|until)\\s+${DAY_PATTERN}`,
      "i",
    ),
  );
  if (!range) return null;

  const startDay = normalizeDay(range[1]);
  const endDay = normalizeDay(range[2]);
  if (!startDay || !endDay) return null;

  const fullDays = daysBetween(startDay, endDay);
  const days = fullDays.map(dayCode);
  const timed = Boolean(time.startTime && time.endTime);

  return buildResolution(input, {
    kind: "recurring",
    recurrence: { frequency: "weekly", days },
    startTime: timed ? time.startTime : undefined,
    endTime: timed ? time.endTime : undefined,
    isTimed: timed,
    timeSource: timed ? time.source : "none",
    durationMinutes: timed ? time.durationMinutes : undefined,
    timelineRole: "schedule",
    confidence: timed ? 0.95 : 0.88,
    tense: "present",
    needsConfirmation: true,
    label: [
      formatWeeklyDaysLabel(fullDays),
      timed && time.startTime && time.endTime
        ? `${displayTime(time.startTime)}-${displayTime(time.endTime)}`
        : null,
    ]
      .filter(Boolean)
      .join(", "),
  });
}

function parseNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  if (value.toLowerCase() === "an" || value.toLowerCase() === "a") return 1;
  return NUMBER_WORDS[value.toLowerCase()] ?? null;
}

function durationBetween(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return undefined;
  const [startHourText, startMinuteText = "0"] = startTime.split(":");
  const [endHourText, endMinuteText = "0"] = endTime.split(":");
  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  const endHour = Number(endHourText);
  const endMinute = Number(endMinuteText);
  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return undefined;
  }
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  return end - start;
}

function parseOrdinalDay(text: string) {
  const match = text.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!match) return null;
  const day = Number(match[1]);
  if (Number.isNaN(day) || day < 1 || day > 31) return null;
  return day;
}

function resolveDayOfMonth(day: number, now: Date) {
  let date = new Date(now.getFullYear(), now.getMonth(), day);
  if (date < now) date = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return date;
}

function resolveDatePhrase(
  text: string,
  now: Date,
  tense: TimelineResolution["tense"] = "future",
) {
  if (/\btomorrow\b/.test(text)) return { date: addDays(now, 1), label: "Tomorrow" };
  if (/\btoday\b/.test(text)) return { date: now, label: "Today" };
  if (/\byesterday\b/.test(text)) return { date: addDays(now, -1), label: "Yesterday" };

  const explicitDay = text.match(new RegExp(`\\b(next|last|this)\\s+${DAY_PATTERN}\\b`));
  if (explicitDay) {
    const day = normalizeDay(explicitDay[2]);
    if (!day) return null;
    const direction = explicitDay[1] === "last" ? "past" : "this";
    let date = resolveWeekdayDate(day, now, direction);
    if (date && explicitDay[1] === "next") date = addDays(date, 7);
    return date ? { date, label: `${explicitDay[1]} ${day}` } : null;
  }

  const bareDay = text.match(new RegExp(`\\b${DAY_PATTERN}\\b`));
  if (bareDay) {
    const day = normalizeDay(bareDay[1]);
    if (!day) return null;
    const date = resolveWeekdayDate(day, now, tense === "past" ? "past" : "future");
    return date ? { date, label: day } : null;
  }

  const monthDate = text.match(new RegExp(`\\b${MONTH_PATTERN}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  if (monthDate) {
    const month = MONTH_INDEX[monthDate[1]];
    const day = Number(monthDate[2]);
    let date = new Date(now.getFullYear(), month, day);
    if (date < now) date = new Date(now.getFullYear() + 1, month, day);
    return { date, label: `${monthDate[1]} ${day}` };
  }

  const ordinal = parseOrdinalDay(text);
  if (ordinal) return { date: resolveDayOfMonth(ordinal, now), label: `the ${ordinal}` };

  return null;
}

function resolveMidnight(text: string) {
  return /\bmidnight\b/.test(text) ? "00:00" : undefined;
}

function confidenceLabel(confidence: number): TimelineResolution["confidenceLabel"] {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}

function buildResolution(
  input: string,
  resolution: Omit<
    TimelineResolution,
    | "confidenceLabel"
    | "needsConfirmation"
    | "sourceText"
    | "scheduleInferenceApplied"
    | "timeSource"
    | "isTimed"
    | "timelineRole"
  > & {
    needsConfirmation?: boolean;
    scheduleInferenceApplied?: boolean;
    timeSource?: TimelineResolution["timeSource"];
    isTimed?: boolean;
    timelineRole?: TimelineResolution["timelineRole"];
  },
): TimelineResolution {
  const label = confidenceLabel(resolution.confidence);
  return {
    ...resolution,
    confidenceLabel: label,
    needsConfirmation:
      resolution.needsConfirmation ?? resolution.confidence < 0.85,
    sourceText: input,
    scheduleInferenceApplied: resolution.scheduleInferenceApplied ?? false,
    timeSource: resolution.timeSource ?? "none",
    isTimed: resolution.isTimed ?? false,
    timelineRole: resolution.timelineRole ?? "event",
  };
}

function resolveWeekdayDate(
  day: string,
  now: Date,
  direction: "past" | "future" | "this",
) {
  const currentIndex = now.getDay();
  const targetIndex = dayIndex(day);
  if (targetIndex < 0) return null;

  if (direction === "past") {
    const diff = (currentIndex - targetIndex + 7) % 7;
    return addDays(now, diff === 0 ? -7 : -diff);
  }

  if (direction === "future") {
    const diff = (targetIndex - currentIndex + 7) % 7;
    return addDays(now, diff === 0 ? 7 : diff);
  }

  return addDays(now, targetIndex - currentIndex);
}

function detectTense(text: string): TimelineResolution["tense"] {
  if (/\b(get paid|getting paid|payday|paid on|paid friday|paid next)\b/.test(text)) {
    return "future";
  }

  if (
    /\b(worked|went|had|did|finished|completed|spent|paid|studied|slept|ran|was|were|yesterday|last)\b/.test(
      text,
    )
  ) {
    return "past";
  }

  if (
    /\b(will|gonna|going to|tomorrow|tonight|next|upcoming|later|in\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:days?|weeks?))\b/.test(
      text,
    )
  ) {
    return "future";
  }

  if (
    /\b(have|need to|appointment|meeting|doctor|dentist|gym|workout|date|dinner|call)\b/.test(
      text,
    )
  ) {
    return "future";
  }

  if (/\b(every|each|monthly|weekly|work|works|due)\b/.test(text)) {
    return "present";
  }

  return "unknown";
}

function isWorkRelated(text: string) {
  return /\b(work|worked|shift|job)\b/.test(text);
}

function hasInputTimeRange(text: string) {
  return /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to|through|thru|until)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(
    text,
  );
}

function displayTime(value?: string) {
  if (!value) return undefined;
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${meridiem}`;
}

function enrichWorkTimeMetadata(
  input: string,
  resolution: TimelineResolution,
  options: ResolveTimelineOptions,
) {
  if (!isWorkRelated(input.toLowerCase())) {
    return resolution;
  }

  if (resolution.timelineRole === "log" || resolution.timelineRole === "deadline") {
    return resolution;
  }

  if (
    resolution.timelineRole === "schedule" &&
    isStandingWorkScheduleLanguage(input.toLowerCase())
  ) {
    return resolution;
  }

  if (resolution.startTime && resolution.endTime) {
    return {
      ...resolution,
      scheduleInferenceApplied: false,
      timeSource: "input" as const,
      isTimed: true,
      durationMinutes:
        resolution.durationMinutes ??
        durationBetween(resolution.startTime, resolution.endTime),
    };
  }

  const schedule = options.userContext?.workSchedule;
  if (schedule && resolutionMatchesWorkSchedule(resolution, schedule)) {
    return {
      ...resolution,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      needsConfirmation: resolution.needsConfirmation,
      scheduleInferenceApplied: true,
      timeSource: "user_context" as const,
      isTimed: true,
      durationMinutes: durationBetween(schedule.startTime, schedule.endTime),
    };
  }

  return {
    ...resolution,
    needsConfirmation: true,
    scheduleInferenceApplied: false,
    timeSource: "none" as const,
    isTimed: false,
  };
}

function resolveRecurring(
  input: string,
  text: string,
  time: ResolvedTime,
  now: Date,
): TimelineResolution | null {
  const standingSchedule = resolveStandingWorkSchedule(input, text, time);
  if (standingSchedule) return standingSchedule;

  const monthly = text.match(/\bevery month on the (\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthly) {
    const dayOfMonth = Number(monthly[1]);
    return buildResolution(input, {
      kind: "recurring",
      recurrence: { frequency: "monthly", dayOfMonth },
      confidence: 0.93,
      tense: "present",
      label: `Every month on the ${dayOfMonth}`,
    });
  }

  const everyOther = text.match(new RegExp(`\\bevery other\\s+${DAY_PATTERN}\\b`));
  if (everyOther) {
    const day = normalizeDay(everyOther[1]);
    if (!day) return null;
    const nextOccurrence = resolveWeekdayDate(day, now, "future");
    return buildResolution(input, {
      kind: "recurring",
      recurrence: { frequency: "biweekly", days: [day] },
      startDate: nextOccurrence ? toDateKey(nextOccurrence) : undefined,
      timelineRole: "task",
      confidence: 0.94,
      tense: "present",
      label: `Every other ${day}`,
    });
  }

  const everyDay = text.match(new RegExp(`\\bevery\\s+${DAY_PATTERN}\\b`));
  if (everyDay) {
    const day = normalizeDay(everyDay[1]);
    if (!day) return null;
    return buildResolution(input, {
      kind: "recurring",
      recurrence: { frequency: "weekly", days: [day] },
      confidence: 0.92,
      tense: "present",
      label: `Every ${day}`,
    });
  }

  return null;
}

function resolveDurationLog(input: string, text: string, now: Date) {
  const duration = text.match(
    /\b(?:for\s+)?(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(hours?|hrs?|minutes?|mins?)\b/,
  );
  if (!duration) return null;
  const amount = parseNumber(duration[1]);
  if (!amount) return null;
  const unit =
    duration[2].startsWith("hour") || duration[2].startsWith("hr")
      ? "hour"
      : "minute";
  const tense = detectTense(text);
  const hasDateLanguage = new RegExp(
    `\\b(today|tomorrow|yesterday|last|next|this|${DAY_PATTERN}|${MONTH_PATTERN})\\b`,
  ).test(text);
  const date = hasDateLanguage ? resolveDatePhrase(text, now, tense) : null;

  return buildResolution(input, {
    kind: date ? "single_date" : "unknown",
    startDate: date ? toDateKey(date.date) : undefined,
    durationMinutes: unit === "hour" ? amount * 60 : amount,
    timelineRole: "log",
    isTimed: false,
    timeSource: "none",
    confidence: 0.88,
    tense,
    label: date?.label ?? "Logged time",
  });
}

function resolveDeadline(input: string, text: string, now: Date) {
  const deadline = text.match(/\b(?:by|before|due(?:\s+on)?)\s+(.+)$/);
  if (!deadline) return null;
  const phrase = deadline[1];
  const date = resolveDatePhrase(phrase, now);
  if (!date) return null;
  const deadlineTime = resolveMidnight(phrase);

  return buildResolution(input, {
    kind: "single_date",
    deadlineDate: toDateKey(date.date),
    deadlineTime,
    timelineRole: "deadline",
    isTimed: false,
    timeSource: deadlineTime ? "input" : "none",
    confidence: 0.9,
    tense: "future",
    label: `Due ${date.label}`,
  });
}

function resolveWeekend(input: string, text: string, now: Date) {
  if (!/\bthis weekend\b/.test(text)) return null;
  const saturday = resolveWeekdayDate("Saturday", now, "this");
  const sunday = saturday ? addDays(saturday, 1) : null;
  if (!saturday || !sunday) return null;
  return buildResolution(input, {
    kind: "date_range",
    startDate: toDateKey(saturday),
    endDate: toDateKey(sunday),
    confidence: 0.88,
    tense: "future",
    label: "This weekend",
  });
}

function resolveRange(
  input: string,
  text: string,
  now: Date,
  tense: TimelineResolution["tense"],
  time: ResolvedTime,
) {
  const commandIntent = detectSyncCommandIntent(input);
  if (commandIntent.type === "edit" || commandIntent.type === "delete") {
    return null;
  }

  const range = text.match(
    new RegExp(
      `(?:from\\s+)?${DAY_PATTERN}(?:\\s+(night|morning|afternoon|evening))?\\s+(?:through|thru|to|until|and)\\s+${DAY_PATTERN}(?:\\s+(night|morning|afternoon|evening))?`,
    ),
  );
  const between = text.match(
    new RegExp(`\\bbetween\\s+${DAY_PATTERN}\\s+and\\s+${DAY_PATTERN}\\b`),
  );
  const match = range ?? between;
  if (!match) return null;

  const startDay = normalizeDay(match[1]);
  const endDay = normalizeDay(match[3] ?? match[2]);
  if (!startDay || !endDay) return null;

  const direction = tense === "past" ? "past" : tense === "future" ? "future" : "this";
  const start = resolveWeekdayDate(startDay, now, direction);
  let end = resolveWeekdayDate(endDay, now, direction);
  if (!start || !end) return null;
  if (end < start) end = addDays(end, 7);

  return buildResolution(input, {
    kind: "date_range",
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    startTime: time.isTimed ? time.startTime : undefined,
    endTime: time.isTimed ? time.endTime : undefined,
    isTimed: time.isTimed,
    timeSource: time.source,
    durationMinutes: time.durationMinutes,
    timelineRole: time.isTimed ? "event" : "task",
    confidence: tense === "unknown" ? 0.78 : 0.9,
    tense,
    label: `${startDay} through ${endDay}`,
  });
}

function resolveRelative(
  input: string,
  text: string,
  now: Date,
  time: ResolvedTime,
) {
  if (/\btoday\b/.test(text)) {
    return buildResolution(input, {
      kind: "relative",
      startDate: toDateKey(now),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.95,
      tense: "present",
      label: "Today",
    });
  }

  if (/\btonight\b/.test(text)) {
    return buildResolution(input, {
      kind: "relative",
      startDate: toDateKey(now),
      startTime: time.isTimed ? time.startTime : undefined,
      endTime: time.isTimed ? time.endTime : undefined,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.93,
      tense: "future",
      label: "Tonight",
    });
  }

  if (/\btomorrow\b/.test(text)) {
    return buildResolution(input, {
      kind: "relative",
      startDate: toDateKey(addDays(now, 1)),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.95,
      tense: "future",
      label: "Tomorrow",
    });
  }

  if (/\byesterday\b/.test(text)) {
    return buildResolution(input, {
      kind: "relative",
      startDate: toDateKey(addDays(now, -1)),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.95,
      tense: "past",
      label: "Yesterday",
    });
  }

  const inDays = text.match(
    /\bin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?)\b/,
  );
  if (inDays) {
    const amount = parseNumber(inDays[1]);
    if (amount) {
      const unit = inDays[2].startsWith("week") ? "week" : "day";
      const days = unit === "week" ? amount * 7 : amount;
      return buildResolution(input, {
        kind: "relative",
        startDate: toDateKey(addDays(now, days)),
        startTime: time.startTime,
        endTime: time.endTime,
        isTimed: time.isTimed,
        timeSource: time.source,
        durationMinutes: time.durationMinutes,
        timelineRole: time.isTimed ? "event" : "task",
        confidence: 0.94,
        tense: "future",
        label: `In ${amount} ${unit}${amount === 1 ? "" : "s"}`,
      });
    }
  }

  if (/\bnext week\b/.test(text)) {
    return buildResolution(input, {
      kind: "relative",
      startDate: toDateKey(addDays(now, 7)),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.85,
      tense: "future",
      label: "Next week",
    });
  }

  return null;
}

function resolveAbsoluteCalendarDate(
  input: string,
  text: string,
  now: Date,
  tense: TimelineResolution["tense"],
  time: ResolvedTime,
) {
  const date = resolveDatePhrase(text, now, tense);
  if (!date) return null;

  const isBirthday = /\bbirthday\b/.test(text);
  const isPast = tense === "past";
  const role: TimelineResolution["timelineRole"] = isPast
    ? "log"
    : isBirthday
      ? "event"
      : time.isTimed
        ? "event"
        : "event";

  if (isBirthday) {
    const month = date.date.getMonth();
    const dayOfMonth = date.date.getDate();
    return buildResolution(input, {
      kind: "recurring",
      startDate: toDateKey(date.date),
      recurrence: { frequency: "yearly", month, dayOfMonth },
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: role,
      confidence: 0.9,
      tense: tense === "unknown" ? "future" : tense,
      label: date.label,
      needsConfirmation: false,
    });
  }

  return buildResolution(input, {
    kind: "single_date",
    startDate: toDateKey(date.date),
    startTime: time.startTime,
    endTime: time.endTime,
    isTimed: time.isTimed,
    timeSource: time.source,
    durationMinutes: time.durationMinutes,
    timelineRole: role,
    confidence: 0.88,
    tense: tense === "unknown" ? "future" : tense,
    label: date.label,
  });
}

function resolveWeekday(
  input: string,
  text: string,
  now: Date,
  time: ResolvedTime,
) {
  const explicit = text.match(
    new RegExp(`\\b(last|next|this)\\s+${DAY_PATTERN}\\b`),
  );
  if (explicit) {
    const modifier = explicit[1] as "last" | "next" | "this";
    const day = normalizeDay(explicit[2]);
    if (!day) return null;
    const direction = modifier === "last" ? "past" : "this";
    let date = resolveWeekdayDate(day, now, direction);
    if (date && modifier === "next") date = addDays(date, 7);
    if (!date) return null;
    return buildResolution(input, {
      kind: "single_date",
      startDate: toDateKey(date),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.9,
      tense: modifier === "last" ? "past" : modifier === "next" ? "future" : "future",
      label: `${modifier[0].toUpperCase()}${modifier.slice(1)} ${day}`,
    });
  }

  const bare = text.match(new RegExp(`\\b${DAY_PATTERN}\\b`));
  if (!bare) return null;
  const day = normalizeDay(bare[1]);
  if (!day) return null;

  const tense = detectTense(text);
  if (tense === "past") {
    const date = resolveWeekdayDate(day, now, "past");
    if (!date) return null;
    return buildResolution(input, {
      kind: "single_date",
      startDate: toDateKey(date),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.86,
      tense,
      label: day,
    });
  }

  if (tense === "future") {
    const date = resolveWeekdayDate(day, now, "future");
    if (!date) return null;
    return buildResolution(input, {
      kind: "single_date",
      startDate: toDateKey(date),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.84,
      tense,
      label: day,
    });
  }

  if (tense === "present" && isWorkRelated(text)) {
    const date = resolveWeekdayDate(day, now, "future");
    if (!date) return null;
    return buildResolution(input, {
      kind: "recurring",
      recurrence: { frequency: "weekly", days: [dayCode(day)] },
      startDate: toDateKey(date),
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: "schedule",
      confidence: 0.88,
      tense,
      label: `Every ${day}`,
    });
  }

  return buildResolution(input, {
    kind: "single_date",
    startDate: toDateKey(resolveWeekdayDate(day, now, "future") ?? now),
    startTime: time.startTime,
    endTime: time.endTime,
    isTimed: time.isTimed,
    timeSource: time.source,
    durationMinutes: time.durationMinutes,
    timelineRole: time.isTimed ? "event" : "task",
    confidence: time.isTimed ? 0.74 : 0.68,
    tense: "future",
    label: day,
    needsConfirmation: true,
  });
}

export function resolveTimeline(
  input: string,
  options: ResolveTimelineOptions = {},
): TimelineResolution {
  const sourceText = input.trim();
  const text = sourceText.toLowerCase();
  const now = startOfDay(options.now ?? new Date());
  const tense = detectTense(text);
  const time = resolveTime(sourceText);

  const resolution =
    resolveDeadline(sourceText, text, now) ??
    resolveDurationLog(sourceText, text, now) ??
    resolveRecurring(sourceText, text, time, now) ??
    resolveWeekend(sourceText, text, now) ??
    resolveRange(sourceText, text, now, tense, time) ??
    resolveRelative(sourceText, text, now, time) ??
    resolveWeekday(sourceText, text, now, time) ??
    resolveAbsoluteCalendarDate(sourceText, text, now, tense, time) ??
    buildResolution(sourceText, {
      kind: "unknown",
      startTime: time.startTime,
      endTime: time.endTime,
      isTimed: time.isTimed,
      timeSource: time.source,
      durationMinutes: time.durationMinutes,
      timelineRole: time.isTimed ? "event" : "task",
      confidence: 0.25,
      tense,
      label: "Needs a timeline",
      needsConfirmation: true,
    });

  const timeAwareResolution =
    time.isTimed &&
    !hasInputTimeRange(text) &&
    !(resolution.startDate && resolution.confidence >= 0.9)
      ? { ...resolution, needsConfirmation: true }
      : resolution;

  return enrichWorkTimeMetadata(sourceText, timeAwareResolution, options);
}
