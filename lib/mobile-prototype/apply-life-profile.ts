import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { materializeOnboardingReading } from "@/lib/sync-profile/materialize-onboarding-reading";
import { type SyncUserProfile } from "@/lib/mobile-prototype/life-profile";
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

  return materializeOnboardingReading(profile, {
    items: context.items,
    addCapturedItem: context.addCapturedItem,
    reference,
  }).profile;
}
