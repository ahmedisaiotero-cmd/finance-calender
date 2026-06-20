import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import {
  CAPTURE_CLARIFY_BIRTHDAY,
  CAPTURE_CLARIFY_FLIGHT_TIME,
  CAPTURE_CLARIFY_RENT_WHEN,
  CAPTURE_CLARIFY_WHEN,
  CAPTURE_CLARIFY_WHO,
} from "@/lib/mobile-prototype/sync-voice";
import type { PreparedCapture } from "@/lib/sync-capture/save-capture";

export type CaptureClarification = {
  message: string;
  suggestions: string[];
};

export function detectCaptureClarification(
  text: string,
  prepared: PreparedCapture | null,
  reference = new Date(),
): CaptureClarification | null {
  const normalized = text.trim().toLowerCase();

  if (/^(call|text|message)\s+(her|him|them)\b/.test(normalized)) {
    return {
      message: CAPTURE_CLARIFY_WHO,
      suggestions: ["Mom", "Girlfriend", "Friend"],
    };
  }

  if (
    /^(birthday|bday)\s+tomorrow\b/.test(normalized) ||
    /^(a\s+)?birthday\s+tomorrow\b/.test(normalized)
  ) {
    return {
      message: CAPTURE_CLARIFY_BIRTHDAY,
      suggestions: ["Mom", "Friend", "Girlfriend"],
    };
  }

  if (/\bflight\s+tomorrow\b/.test(normalized) && !/\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(text)) {
    return {
      message: CAPTURE_CLARIFY_FLIGHT_TIME,
      suggestions: ["6 AM", "7:30 AM", "9 PM"],
    };
  }

  if (/^rent\b/.test(normalized) && !/\b(due|pay|tomorrow|friday|monday)\b/.test(normalized)) {
    return {
      message: CAPTURE_CLARIFY_RENT_WHEN,
      suggestions: ["tomorrow", "Friday", "the 1st"],
    };
  }

  const plan = prepared?.plan ?? createPulsePlan(text, { timeline: { now: reference } });
  const timeline = plan.timeline;
  const hasDate = Boolean(timeline?.startDate || timeline?.deadlineDate);

  if (!hasDate && /\b(rent|payday|appointment|flight|birthday)\b/i.test(normalized)) {
    return {
      message: CAPTURE_CLARIFY_WHEN,
      suggestions: ["today", "tomorrow", "Friday"],
    };
  }

  return null;
}
