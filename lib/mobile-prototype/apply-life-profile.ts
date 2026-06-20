import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { saveUserProfile } from "@/lib/sync-profile/user-profile";
import { attemptBriefCapture } from "@/lib/mobile-prototype/capture-brief-input";
import {
  type SyncUserProfile,
  splitComingUpLines,
} from "@/lib/mobile-prototype/life-profile";
import type { PulsePlan } from "@/lib/pulse/types";
import { saveWorkSchedule } from "@/lib/user-timeline-context";

export function parseTypicalWeekToSchedule(text: string, reference = new Date()) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const plan = createPulsePlan(trimmed, { timeline: { now: reference } });
  if (plan.category !== "work-schedule" || !plan.timeline?.recurrence?.days?.length) {
    return null;
  }

  return {
    days: plan.timeline.recurrence.days,
    startTime: plan.timeline.startTime ?? "09:00",
    endTime: plan.timeline.endTime ?? "17:00",
  };
}

function promptAlreadyRemembered(items: CapturedSyncItem[], line: string) {
  const needle = line.trim().toLowerCase();
  if (!needle) return true;
  return items.some((item) => {
    const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
    return prompt.includes(needle) || needle.includes(prompt);
  });
}

export function applyLifeProfile(
  profile: SyncUserProfile,
  context: {
    items: CapturedSyncItem[];
    addCapturedItem: (
      plan: PulsePlan & { status: "saved" },
      destinations: CapturedSyncItem["destinations"],
      title?: string,
      extras?: {
        meaning?: CapturedSyncItem["meaning"];
      },
    ) => CapturedSyncItem;
    reference?: Date;
  },
) {
  const reference = context.reference ?? new Date();

  const schedule = parseTypicalWeekToSchedule(profile.typicalWeek, reference);
  if (schedule) {
    saveWorkSchedule({
      ...schedule,
      recurrence: {
        frequency: "weekly",
        interval: 1,
        startsOn: toDateKey(reference),
        endsOn: null,
      },
    });
  }

  let items = [...context.items];
  for (const line of splitComingUpLines(profile.comingUp)) {
    if (promptAlreadyRemembered(items, line)) continue;

    const attempt = attemptBriefCapture(line, {
      items,
      workSchedule: schedule
        ? {
            days: schedule.days,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            recurrence: {
              frequency: "weekly",
              interval: 1,
              startsOn: toDateKey(reference),
              endsOn: null,
            },
            status: "active",
          }
        : undefined,
      reference,
    });

    if (attempt.status !== "saved") continue;

    const captured = context.addCapturedItem(
      attempt.result.plan,
      attempt.result.destinations,
      attempt.result.title,
      { meaning: attempt.result.meaning },
    );
    items = [captured, ...items];
  }

  return saveUserProfile(profile);
}
