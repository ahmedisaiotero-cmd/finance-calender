import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  enrichCapturePlan,
  isSilentCaptureReady,
  prepareCaptureFromText,
  type PreparedCapture,
} from "@/lib/sync-capture/save-capture";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulsePlan } from "@/lib/pulse/types";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { describeItemTiming } from "@/lib/mobile-prototype/build-daily-brief";

export type BriefCaptureResult = {
  plan: PulsePlan & { status: "saved" };
  destinations: ReturnType<typeof sanitizeSyncDestinations>;
  title: string;
  meaning: PreparedCapture["meaning"];
};

export type BriefCaptureAttempt =
  | { status: "saved"; result: BriefCaptureResult }
  | {
      status: "needs_clarification";
      draftText: string;
      message: string;
      suggestions: string[];
    }
  | { status: "too_vague"; message: string }
  | { status: "empty" };

const VAGUE_CAPTURE_MESSAGE =
  "Tell Sync something that happened or something coming up.";

function isVagueCaptureInput(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ");

  if (!normalized) return true;

  const vagueExact = new Set([
    "whats up",
    "what's up",
    "hey",
    "hi",
    "hello",
    "sup",
    "yo",
    "how are you",
    "hows it going",
    "how's it going",
    "good morning",
    "good afternoon",
    "good evening",
    "thanks",
    "thank you",
    "ok",
    "okay",
    "yes",
    "no",
    "sure",
    "maybe",
    "idk",
    "nvm",
    "help",
    "test",
    "testing",
  ]);

  if (vagueExact.has(normalized)) return true;

  const words = normalized.split(" ").filter(Boolean);
  const hasSignal =
    /\d/.test(normalized) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight|next|paid|payday|due|birthday|rent|gym|work|mom|dad|trip|meeting|appointment|overtime)\b/.test(
      normalized,
    );

  return words.length <= 2 && !hasSignal;
}

function clarificationForCapture(
  plan: PulsePlan,
  destinations: string[],
): { message: string; suggestions: string[] } {
  const timeline = plan.timeline;
  const hasDate = Boolean(timeline?.startDate || timeline?.deadlineDate);

  if (destinations.length === 0) {
    return {
      message: "I need a bit more to place this.",
      suggestions: ["today", "tomorrow", "Friday"],
    };
  }

  if (!hasDate) {
    return {
      message: "When is this?",
      suggestions: ["today", "tomorrow", "Friday", "next Friday"],
    };
  }

  return {
    message: "Tell me a bit more so I can place this.",
    suggestions: ["today", "tomorrow", "next week"],
  };
}

export function attemptBriefCapture(
  text: string,
  context: {
    items: CapturedSyncItem[];
    workSchedule?: PersistedWorkSchedule | null;
    reference?: Date;
  },
): BriefCaptureAttempt {
  const trimmed = text.trim();
  if (!trimmed) return { status: "empty" };

  if (isVagueCaptureInput(trimmed)) {
    return { status: "too_vague", message: VAGUE_CAPTURE_MESSAGE };
  }

  const result = captureFromBriefInput(trimmed, context);
  if (result) {
    return { status: "saved", result };
  }

  const reference = context.reference ?? new Date();
  const rawPlan = createPulsePlan(trimmed, { timeline: { now: reference } });
  const plan = enrichCapturePlan(rawPlan, reference);
  const prepared = prepareCaptureFromText(trimmed, context);
  const destinations = prepared?.destinations ?? [];
  const clarification = clarificationForCapture(plan, destinations);

  return {
    status: "needs_clarification",
    draftText: trimmed,
    message: clarification.message,
    suggestions: clarification.suggestions,
  };
}

export function captureFromBriefInput(
  text: string,
  context: {
    items: CapturedSyncItem[];
    workSchedule?: PersistedWorkSchedule | null;
    reference?: Date;
  },
): BriefCaptureResult | null {
  const prepared = prepareCaptureFromText(text, context);
  if (!prepared || !isSilentCaptureReady(prepared)) {
    return null;
  }

  return {
    plan: { ...prepared.plan, status: "saved" },
    destinations: prepared.destinations,
    title: prepared.title,
    meaning: prepared.meaning,
  };
}

export function formatCaptureAcknowledgment(
  captured: BriefCaptureResult,
  reference = new Date(),
) {
  const stub: CapturedSyncItem = {
    id: captured.plan.id,
    title: captured.title,
    category: captured.plan.category,
    prompt: captured.plan.prompt,
    destinations: captured.destinations,
    dateLabel: captured.plan.dateLabel,
    timeLabel: captured.plan.timeLabel,
    timeline: captured.plan.timeline,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const timing = describeItemTiming(stub, reference);
  if (timing) {
    return `Remembered — ${timing}.`;
  }

  return `Remembered — ${captured.title}.`;
}
