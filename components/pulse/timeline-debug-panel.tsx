"use client";

import { useEffect, useMemo, useState } from "react";

import { analyzeConsequences } from "@/lib/intelligence/consequence-engine";
import { MOCK_SYNC_USER_CONTEXT } from "@/lib/intelligence/sync-user-context";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { detectPulseCategory } from "@/lib/pulse/detect-pulse-category";
import { parsePulsePrompt } from "@/lib/pulse/parse-pulse-prompt";
import {
  checkDestinationSources,
  resolveSyncDestinations,
} from "@/lib/pulse/resolve-sync-destinations";
import {
  buildSyncPreviewViewModel,
  getDestinationChipLabels,
} from "@/lib/pulse/sync-preview-view-model";
import { resolveTime } from "@/lib/timeline/resolve-time";
import {
  resolveTimeline,
  type UserTimelineContext,
} from "@/lib/timeline/resolve-timeline";
import { detectSyncCommandIntent } from "@/lib/sync-command-intent";

const DEV_MOCK_SCHEDULE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_SYNC_DEV_WORK_SCHEDULE === "true";

const DEBUG_USER_TIMELINE_CONTEXT: UserTimelineContext = DEV_MOCK_SCHEDULE_ENABLED
  ? {
      workSchedule: {
        days: ["Sunday", "Monday", "Tuesday", "Wednesday"],
        startTime: "11:00",
        endTime: "21:00",
      },
    }
  : {};

export function TimelineDebugPanel() {
  const [input, setInput] = useState("I worked Sunday through Monday");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const debug = useMemo(() => {
    const normalizedInput = normalizeCaptureInput(input);
    const category = detectPulseCategory(normalizedInput.normalized);
    const parsed = parsePulsePrompt(normalizedInput.normalized, category);
    const detectedTime = resolveTime(normalizedInput.normalized);
    const timeline = resolveTimeline(normalizedInput.normalized, {
      now: new Date("2026-06-10T12:00:00"),
      userContext: DEBUG_USER_TIMELINE_CONTEXT,
    });
    const plan = createPulsePlan(input, {
      timeline: {
        now: new Date("2026-06-10T12:00:00"),
        userContext: DEBUG_USER_TIMELINE_CONTEXT,
      },
    });
    const destinations = resolveSyncDestinations(plan);
    const destinationSourceCheck = checkDestinationSources(plan);
    const preview = buildSyncPreviewViewModel(plan, {
      userContext: MOCK_SYNC_USER_CONTEXT,
    });
    const renderedDestinationChips = getDestinationChipLabels(preview);
    const consequenceAnalysis = analyzeConsequences({
      captureText: normalizedInput.original,
      category,
      destinations,
      timeline,
      userContext: MOCK_SYNC_USER_CONTEXT,
    });

    const commandIntent = detectSyncCommandIntent(input);

    return {
      original: normalizedInput.original,
      normalized: normalizedInput.normalized,
      corrections: normalizedInput.corrections,
      commandIntent,
      userTimelineContext: DEBUG_USER_TIMELINE_CONTEXT,
      devMockScheduleEnabled: DEV_MOCK_SCHEDULE_ENABLED,
      detectedIntent: parsed.moneyType ?? category,
      category,
      destinations,
      destinationSourceCheck,
      previewViewModel: {
        what: preview.what,
        when: preview.when,
        where: preview.where,
        why: {
          summary: preview.why.summary,
          affectedAreas: preview.why.affectedAreas,
        },
        confidence: preview.confidence,
      },
      renderedDestinationChips,
      detectedDateOrRange: {
        kind: timeline.kind,
        label: timeline.label,
        startDate: timeline.startDate,
        endDate: timeline.endDate,
      },
      detectedTime,
      isTimed: timeline.isTimed,
      timelineRole: timeline.timelineRole,
      durationMinutes: timeline.durationMinutes,
      deadlineDate: timeline.deadlineDate,
      deadlineTime: timeline.deadlineTime,
      willBecome: timeline.timelineRole,
      timeline,
      confidence: timeline.confidence,
      needsConfirmation: timeline.needsConfirmation,
      scheduleInferenceApplied: timeline.scheduleInferenceApplied,
      timeSource: timeline.timeSource,
      consequenceAnalysis,
    };
  }, [input]);

  if (!mounted) return null;

  return (
    <details className="mx-auto mt-6 w-full max-w-2xl rounded-[1.15rem] border border-dashed border-border/25 bg-card/20 p-4">
      <summary className="cursor-pointer text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
        Parser debug
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="h-10 rounded-xl border border-border/35 bg-background/35 px-3 text-[13px] text-foreground/85 outline-none"
          aria-label="Timeline parser debug input"
        />
      </div>

      <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-background/45 p-3 text-[11px] leading-relaxed text-muted-foreground/78">
        {JSON.stringify(debug, null, 2)}
      </pre>
    </details>
  );
}
