export type ResolvedTime = {
  startTime?: string;
  endTime?: string;
  isTimed: boolean;
  durationMinutes?: number;
  confidence: number;
  source: "input" | "none";
  label?: string;
};

const VAGUE_WINDOWS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  tonight: "Tonight",
};

function padTime(hour: number, minute = 0) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toClock(hourText: string, minuteText?: string, meridiem?: string) {
  let hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined;

  const normalized = meridiem?.toLowerCase();
  if (normalized === "pm" && hour < 12) hour += 12;
  if (normalized === "am" && hour === 12) hour = 0;

  return padTime(hour, minute);
}

function plusOneHour(value: string) {
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined;
  return padTime((hour + 1) % 24, minute);
}

function displayTime(value?: string) {
  if (!value) return undefined;
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${meridiem}`;
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

function isWorkRelated(text: string) {
  return /\b(work|worked|working|shift|job)\b/.test(text);
}

function isAppointmentLike(text: string) {
  return /\b(meeting|appointment|doctor|dentist|call|visit)\b/.test(text);
}

function isWorkoutLike(text: string) {
  return /\b(gym|workout|exercise|run|lift)\b/.test(text);
}

function resolveImpliedRange(
  text: string,
  startHourText: string,
  endHourText: string,
) {
  const startHour = Number(startHourText);
  const endHour = Number(endHourText);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
    return {};
  }

  let normalizedStart = startHour;
  let normalizedEnd = endHour;

  if (endHour < startHour) {
    normalizedEnd = endHour + 12;
  } else if (isWorkRelated(text) && /\b(work|shift)\b/.test(text)) {
    if (startHour <= 6) normalizedStart = startHour + 12;
    if (endHour <= 11 && normalizedEnd <= normalizedStart) {
      normalizedEnd = endHour + 12;
    }
  }

  return {
    startTime: padTime(normalizedStart),
    endTime: padTime(normalizedEnd),
  };
}

export function resolveTime(input: string): ResolvedTime {
  const text = input.trim().toLowerCase();

  const explicitRange = text.match(
    /\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|to|through|thru|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  );
  if (explicitRange) {
    const startTime = toClock(
      explicitRange[1],
      explicitRange[2],
      explicitRange[3],
    );
    const endTime = toClock(
      explicitRange[4],
      explicitRange[5],
      explicitRange[6],
    );

    if (startTime && endTime) {
      return {
        startTime,
        endTime,
        isTimed: true,
        durationMinutes: durationBetween(startTime, endTime),
        confidence: 0.96,
        source: "input",
        label: `${displayTime(startTime)} - ${displayTime(endTime)}`,
      };
    }
  }

  const impliedRange = text.match(
    /\b(?:(?:from|between)\s+)?(\d{1,2})\s*(?:-|to|and)\s*(\d{1,2})\b/i,
  );
  if (impliedRange) {
    const { startTime, endTime } = resolveImpliedRange(
      text,
      impliedRange[1],
      impliedRange[2],
    );

    if (startTime && endTime) {
      return {
        startTime,
        endTime,
        isTimed: true,
        durationMinutes: durationBetween(startTime, endTime),
        confidence: isWorkRelated(text) ? 0.88 : 0.76,
        source: "input",
        label: `${displayTime(startTime)} - ${displayTime(endTime)}`,
      };
    }
  }

  const singleExplicit = text.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  );
  if (singleExplicit) {
    const startTime = toClock(
      singleExplicit[1],
      singleExplicit[2],
      singleExplicit[3],
    );
    if (startTime) {
      return {
        startTime,
        endTime:
          isAppointmentLike(text) || isWorkoutLike(text)
            ? plusOneHour(startTime)
            : undefined,
        isTimed: true,
        durationMinutes:
          isAppointmentLike(text) || isWorkoutLike(text) ? 60 : undefined,
        confidence: 0.9,
        source: "input",
        label: displayTime(startTime),
      };
    }
  }

  const singleImplied = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (singleImplied) {
    const hour = Number(singleImplied[1]);
    if (!Number.isNaN(hour)) {
      const normalizedHour = hour <= 7 ? hour + 12 : hour;
      const startTime = padTime(normalizedHour, singleImplied[2] ? Number(singleImplied[2]) : 0);
      return {
        startTime,
        endTime:
          isAppointmentLike(text) || isWorkoutLike(text)
            ? plusOneHour(startTime)
            : undefined,
        isTimed: true,
        durationMinutes:
          isAppointmentLike(text) || isWorkoutLike(text) ? 60 : undefined,
        confidence: 0.7,
        source: "input",
        label: displayTime(startTime),
      };
    }
  }

  for (const [word, label] of Object.entries(VAGUE_WINDOWS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      return {
        isTimed: false,
        confidence: 0.72,
        source: "none",
        label,
      };
    }
  }

  return {
    isTimed: false,
    confidence: 1,
    source: "none",
  };
}
