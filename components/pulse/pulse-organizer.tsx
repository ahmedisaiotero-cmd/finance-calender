"use client";

import { Mic } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SyncPreviewPanel } from "@/components/pulse/sync-preview-panel";
import { TimelineDebugPanel } from "@/components/pulse/timeline-debug-panel";
import {
  buildEditPlanFromCommand,
  buildUpdatedCaptureFromPlan,
  resolveCaptureAction,
} from "@/lib/capture-action-resolver";
import type { MeaningActionType } from "@/lib/intelligence/meaning-engine";
import {
  type CapturedSyncItem,
  type SyncDestination,
  useCapturedItems,
} from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { getSyncReliefMessage } from "@/lib/pulse/relief-message";
import {
  resolveSyncDestinations,
  sanitizeSyncDestinations,
} from "@/lib/pulse/resolve-sync-destinations";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import type { PulsePlan } from "@/lib/pulse/types";
import {
  compactCaptureTitle,
  prepareCaptureFromPlan,
  saveCapture,
} from "@/lib/sync-capture/save-capture";
import {
  loadUserProfile,
  profileToSyncUserContext,
} from "@/lib/sync-profile/user-profile";
import { detectAmbiguity } from "@/lib/trust/ambiguity-detection";
import {
  formatReferenceCandidateLabel,
  resolveCaptureReference,
} from "@/lib/trust/reference-resolution";
import { detectSyncCommandIntent, type SyncCommandIntent } from "@/lib/sync-command-intent";
import {
  detectScheduleCommandIntent,
  extractScheduleUpdateQuery,
} from "@/lib/schedule-command-intent";
import {
  deleteWorkSchedule,
  deactivateWorkSchedule,
  loadUserTimelineContext,
  saveWorkSchedule,
  toResolveTimelineContext,
  loadActiveWorkSchedule,
} from "@/lib/user-timeline-context";

const INPUT_PLACEHOLDER = "Tell Sync what happened or what's coming up...";

const STARTER_CHIPS = [
  {
    label: "Work schedule",
    prompt: "My work schedule is Sunday through Wednesday 11am to 9pm",
  },
  {
    label: "Date night",
    prompt: "I have a date Wednesday at 9pm",
  },
  {
    label: "Family event",
    prompt: "My daughter has a school event tomorrow at 7am",
  },
  {
    label: "Rent due",
    prompt: "Rent is due next Friday",
  },
  {
    label: "Workout",
    prompt: "Gym tomorrow at 6pm",
  },
  {
    label: "Call mom",
    prompt: "Call mom tomorrow at 11am",
  },
] as const;

type OrganizerFlow =
  | { kind: "create" }
  | { kind: "schedule-save" }
  | { kind: "schedule-update" }
  | { kind: "schedule-delete" }
  | {
      kind: "edit";
      targetId: string;
      commandIntent: Extract<SyncCommandIntent, { type: "edit" }>;
    }
  | { kind: "delete"; targets: CapturedSyncItem[] }
  | { kind: "duplicate"; matchId: string };

type ActionChoices = {
  intent: "edit" | "delete";
  commandIntent: Extract<SyncCommandIntent, { type: "edit" | "delete" }>;
  targets: CapturedSyncItem[];
};

type AmbiguityChoices = {
  reason?: string;
  interpretations: import("@/lib/trust/ambiguity-detection").SyncInterpretation[];
};

export function PulseOrganizer({ variant = "default" }: { variant?: "default" | "home" }) {
  const {
    activeItems,
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  } = useCapturedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<PulsePlan | null>(null);
  const [flow, setFlow] = useState<OrganizerFlow>({ kind: "create" });
  const [selectedDestinations, setSelectedDestinations] = useState<
    SyncDestination[]
  >([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [reliefMessage, setReliefMessage] = useState<string | null>(null);
  const [actionChoices, setActionChoices] = useState<ActionChoices | null>(null);
  const [ambiguityChoices, setAmbiguityChoices] = useState<AmbiguityChoices | null>(null);
  const [userTimelineContext, setUserTimelineContext] = useState(
    () => toResolveTimelineContext(loadUserTimelineContext()),
  );
  const isHome = variant === "home";

  const timelineOptions = useMemo(
    () => ({ userContext: userTimelineContext }),
    [userTimelineContext],
  );

  const refreshUserTimelineContext = useCallback(() => {
    setUserTimelineContext(toResolveTimelineContext(loadUserTimelineContext()));
  }, []);

  const previewMode = useMemo(() => {
    if (flow.kind === "schedule-delete") return "schedule-delete" as const;
    if (flow.kind === "schedule-update") return "schedule-update" as const;
    if (flow.kind === "schedule-save") return "schedule-save" as const;
    if (flow.kind === "delete") return "delete" as const;
    if (flow.kind === "edit") return "edit" as const;
    if (flow.kind === "duplicate") return "duplicate" as const;
    return "create" as const;
  }, [flow]);

  const preview = useMemo(
    () =>
      plan
        ? buildSyncPreviewViewModel(plan, {
            mode: previewMode,
            selectedDestinations,
            userContext: profileToSyncUserContext(
              loadUserProfile(),
              loadActiveWorkSchedule() ?? null,
            ),
            calendarItems: activeItems,
            workSchedule: loadActiveWorkSchedule() ?? null,
            excludeCaptureId:
              flow.kind === "edit" ? flow.targetId : undefined,
            targetTitle:
              flow.kind === "delete"
                ? flow.targets[0]?.title
                : flow.kind === "edit"
                  ? activeItems.find((item) => item.id === flow.targetId)?.title
                  : undefined,
          })
        : null,
    [plan, previewMode, selectedDestinations, flow, activeItems, userTimelineContext],
  );

  useEffect(() => {
    if (isHome) return;
    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % STARTER_CHIPS.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, [isHome]);

  const resetPreview = useCallback(() => {
    setPlan(null);
    setFlow({ kind: "create" });
    setSelectedDestinations([]);
    setActionChoices(null);
    setAmbiguityChoices(null);
  }, []);

  const generatePreview = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const scheduleCommand = detectScheduleCommandIntent(trimmed);
      if (scheduleCommand.type === "delete") {
        const stored = loadUserTimelineContext().workSchedule;
        if (!stored || stored.status === "deleted") {
          setReliefMessage("You don't have a saved work schedule yet.");
          resetPreview();
          return;
        }

        const nextPlan = createPulsePlan(
          "my work schedule is sunday through monday 11 to 9pm",
          { timeline: timelineOptions },
        );
        setPrompt(trimmed);
        setPlan({ ...nextPlan, title: "Work Schedule", category: "work-schedule" });
        setFlow({ kind: "schedule-delete" });
        setSelectedDestinations(["Work", "Calendar"]);
        setReliefMessage(null);
        setActionChoices(null);
        return;
      }

      if (scheduleCommand.type === "deactivate") {
        const stored = loadUserTimelineContext().workSchedule;
        if (!stored || stored.status !== "active") {
          setReliefMessage("You don't have an active work schedule to hide.");
          resetPreview();
          return;
        }

        const nextPlan = createPulsePlan(
          "my work schedule is sunday through monday 11 to 9pm",
          { timeline: timelineOptions },
        );
        setPrompt(trimmed);
        setPlan({ ...nextPlan, title: "Work Schedule", category: "work-schedule" });
        setFlow({ kind: "schedule-delete" });
        setSelectedDestinations(["Work", "Calendar"]);
        setReliefMessage("This will stop showing your work schedule on the calendar.");
        setActionChoices(null);
        return;
      }

      if (scheduleCommand.type === "update") {
        const query = extractScheduleUpdateQuery(trimmed);
        const nextPlan = createPulsePlan(query, { timeline: timelineOptions });
        setPrompt(trimmed);
        setPlan(nextPlan);
        setFlow({ kind: "schedule-update" });
        setSelectedDestinations(resolveSyncDestinations(nextPlan));
        setReliefMessage(null);
        setActionChoices(null);
        return;
      }

      const commandIntent = detectSyncCommandIntent(trimmed);
      const referenceResolution =
        commandIntent.type === "create"
          ? undefined
          : resolveCaptureReference({
              commandText: trimmed,
              items: activeItems,
            });

      const ambiguity = detectAmbiguity({
        text: trimmed,
        commandIntent,
        referenceResolution,
      });

      if (
        ambiguity.ambiguous &&
        ambiguity.interpretations.some(
          (interpretation) =>
            typeof interpretation.payload === "object" &&
            interpretation.payload !== null &&
            "needsClarification" in interpretation.payload,
        )
      ) {
        setPrompt(trimmed);
        setAmbiguityChoices(ambiguity);
        setReliefMessage(ambiguity.reason ?? "Sync needs a little more clarity.");
        resetPreview();
        return;
      }

      if (
        commandIntent.type === "edit" &&
        ambiguity.ambiguous &&
        ambiguity.interpretations.length > 1
      ) {
        setPrompt(trimmed);
        setAmbiguityChoices(ambiguity);
        setReliefMessage(ambiguity.reason ?? "Which interpretation did you mean?");
        resetPreview();
        return;
      }

      const action = resolveCaptureAction(trimmed, activeItems);

      if (action.intent === "delete") {
        if (referenceResolution?.status === "not_found" || action.targets.length === 0) {
          setPrompt(trimmed);
          setAmbiguityChoices(ambiguity);
          setReliefMessage("I couldn't find a matching item to remove.");
          resetPreview();
          return;
        }

        if (
          referenceResolution?.status === "multiple_matches" ||
          action.targets.length > 1
        ) {
          setPrompt(trimmed);
          setActionChoices({
            intent: "delete",
            commandIntent: action.commandIntent,
            targets: action.targets,
          });
          setReliefMessage("Which one did you mean?");
          return;
        }

        setPrompt(trimmed);
        setPlan(
          createPulsePlan(trimmed, {
            timeline: timelineOptions,
          }),
        );
        setFlow({ kind: "delete", targets: [action.targets[0]] });
        setSelectedDestinations([]);
        setReliefMessage(null);
        return;
      }

      if (action.intent === "edit") {
        if (referenceResolution?.status === "not_found" || !action.primaryTarget) {
          setPrompt(trimmed);
          setAmbiguityChoices(ambiguity);
          setReliefMessage("I couldn't find a matching item to update.");
          resetPreview();
          return;
        }

        if (
          referenceResolution?.status === "multiple_matches" ||
          action.targets.length > 1
        ) {
          setPrompt(trimmed);
          setActionChoices({
            intent: "edit",
            commandIntent: action.commandIntent,
            targets: action.targets,
          });
          setReliefMessage("Which one did you mean?");
          return;
        }

        const nextPlan = buildEditPlanFromCommand(
          action.primaryTarget,
          action.commandIntent,
          trimmed,
          { userContext: timelineOptions.userContext },
        );
        setPrompt(trimmed);
        setPlan(nextPlan);
        setFlow({
          kind: "edit",
          targetId: action.primaryTarget.id,
          commandIntent: action.commandIntent,
        });
        setSelectedDestinations(
          sanitizeSyncDestinations(action.primaryTarget.destinations),
        );
        setReliefMessage(null);
        return;
      }

      const nextPlan = createPulsePlan(trimmed, {
        timeline: timelineOptions,
      });
      setPrompt(trimmed);
      setPlan(nextPlan);
      setFlow(
        nextPlan.category === "work-schedule" &&
          nextPlan.timeline?.kind === "recurring"
          ? { kind: "schedule-save" }
          : { kind: "create" },
      );
      setSelectedDestinations(resolveSyncDestinations(nextPlan));
      setReliefMessage(null);
      setActionChoices(null);
    },
    [activeItems, resetPreview, timelineOptions],
  );

  const generatePreviewFromInput = useCallback(() => {
    generatePreview(inputRef.current?.value ?? prompt);
  }, [generatePreview, prompt]);

  const handlePreviewSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    generatePreviewFromInput();
  };

  const handleSavePlan = () => {
    if (!plan) return;

    if (flow.kind === "schedule-delete") {
      if (/\bstop\s+showing\b/i.test(prompt) || /\bhide\b/i.test(prompt)) {
        deactivateWorkSchedule();
        setReliefMessage("Your work schedule is hidden from the calendar.");
      } else {
        deleteWorkSchedule();
        setReliefMessage("Removed your work schedule.");
      }
      refreshUserTimelineContext();
      resetPreview();
      setPrompt("");
      return;
    }

    if (flow.kind === "schedule-save" || flow.kind === "schedule-update") {
      if (selectedDestinations.length === 0) return;

      const days = plan.timeline?.recurrence?.days ?? [];
      if (days.length === 0) return;

      const title = compactCaptureTitle(plan);
      let sourceItemId = loadUserTimelineContext().workSchedule?.sourceItemId;

      if (flow.kind === "schedule-save") {
        const capturedItem = addCapturedItem(
          { ...plan, status: "saved" },
          sanitizeSyncDestinations(selectedDestinations),
          title,
        );
        sourceItemId = capturedItem.id;
      } else if (sourceItemId) {
        const existing = activeItems.find((item) => item.id === sourceItemId);
        if (existing) {
          updateCapturedItem(
            sourceItemId,
            buildUpdatedCaptureFromPlan(
              existing,
              plan,
              sanitizeSyncDestinations(selectedDestinations),
              title,
            ),
          );
        } else {
          const capturedItem = addCapturedItem(
            { ...plan, status: "saved" },
            sanitizeSyncDestinations(selectedDestinations),
            title,
          );
          sourceItemId = capturedItem.id;
        }
      } else {
        const capturedItem = addCapturedItem(
          { ...plan, status: "saved" },
          sanitizeSyncDestinations(selectedDestinations),
          title,
        );
        sourceItemId = capturedItem.id;
      }

      saveWorkSchedule({
        days,
        startTime: plan.timeline?.startTime ?? "09:00",
        endTime: plan.timeline?.endTime ?? "17:00",
        sourceItemId,
      });
      refreshUserTimelineContext();
      setReliefMessage(
        flow.kind === "schedule-update"
          ? "Updated your work schedule."
          : "Saved your work schedule. Sync will remember this weekly rhythm.",
      );
      resetPreview();
      setPrompt("");
      return;
    }

    if (flow.kind === "delete") {
      const target = flow.targets[0];
      if (!target) return;
      softDeleteCapturedItem(target.id);
      setReliefMessage(`Removed "${target.title}". You can always capture it again.`);
      resetPreview();
      setPrompt("");
      return;
    }

    if (flow.kind === "edit") {
      const existing = activeItems.find((item) => item.id === flow.targetId);
      if (!existing || selectedDestinations.length === 0) return;

      const updated = updateCapturedItem(
        flow.targetId,
        buildUpdatedCaptureFromPlan(
          existing,
          plan,
          sanitizeSyncDestinations(selectedDestinations),
          flow.commandIntent.operation === "rename" ? compactCaptureTitle(plan) : existing.title,
        ),
      );

      if (updated) {
        setReliefMessage(`Updated "${updated.title}".`);
      }
      resetPreview();
      setPrompt("");
      return;
    }

    if (plan.status !== "draft" || selectedDestinations.length === 0) {
      return;
    }

    const prepared = prepareCaptureFromPlan(plan, {
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      selectedDestinations,
      previewMode,
      excludeCaptureId: flow.kind === "edit" ? flow.targetId : undefined,
    });

    if (
      flow.kind === "create" &&
      prepared.duplicate.isDuplicate &&
      prepared.duplicate.bestMatch
    ) {
      setFlow({ kind: "duplicate", matchId: prepared.duplicate.bestMatch.item.id });
      return;
    }

    saveCapturedPlan({ protectTime: false });
  };

  const saveCapturedPlan = (options?: {
    protectTime?: boolean;
    reliefOverride?: string;
  }) => {
    if (!plan || selectedDestinations.length === 0) return;

    const prepared = prepareCaptureFromPlan(plan, {
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      selectedDestinations,
      previewMode,
      excludeCaptureId: flow.kind === "edit" ? flow.targetId : undefined,
    });

    const saved = saveCapture(prepared, addCapturedItem, {
      protectTime: options?.protectTime,
      skipDuplicateCheck: true,
    });
    if (!saved) return;

    const capturedItem = saved.item;
    setPlan({ ...plan, status: "saved" });
    setReliefMessage(
      options?.reliefOverride ??
        (options?.protectTime
          ? `Protected time for "${capturedItem.title}".`
          : getSyncReliefMessage(plan, capturedItem)),
    );
  };

  const handleProtectTime = () => {
    saveCapturedPlan({ protectTime: true });
  };

  const handleSuggestedAction = (actionType: MeaningActionType) => {
    if (!plan || !preview) return;

    if (actionType === "protect_time") {
      handleProtectTime();
      return;
    }

    if (actionType === "set_leave_reminder") {
      saveCapturedPlan({
        protectTime: false,
        reliefOverride: `Saved "${compactCaptureTitle(plan)}". Leave reminder noted — you can set the exact alert next.`,
      });
      return;
    }

    if (actionType === "adjust_work") {
      saveCapturedPlan({
        protectTime: false,
        reliefOverride: `Saved "${compactCaptureTitle(plan)}". Work availability adjustment is noted for later.`,
      });
      return;
    }

    if (actionType === "reschedule_conflict") {
      handleChangeTime();
      return;
    }

    if (actionType === "add_reminder") {
      saveCapturedPlan({
        protectTime: false,
        reliefOverride: `Saved "${compactCaptureTitle(plan)}". Reminder suggestion noted.`,
      });
      return;
    }

    handleSavePlan();
  };

  const handleUpdateExisting = () => {
    if (!plan || flow.kind !== "duplicate") return;
    const existing = activeItems.find((item) => item.id === flow.matchId);
    if (!existing) return;

    const updated = updateCapturedItem(
      flow.matchId,
      buildUpdatedCaptureFromPlan(
        existing,
        plan,
        sanitizeSyncDestinations(selectedDestinations),
        compactCaptureTitle(plan),
      ),
    );

    if (updated) {
      setReliefMessage(`Updated "${updated.title}" instead of creating a duplicate.`);
    }
    resetPreview();
    setPrompt("");
  };

  const handleKeepBoth = () => {
    if (!plan || selectedDestinations.length === 0) return;

    const capturedItem = addCapturedItem(
      { ...plan, status: "saved", id: crypto.randomUUID() },
      sanitizeSyncDestinations(selectedDestinations),
      compactCaptureTitle(plan),
      { meaning: preview?.meaning },
    );
    setReliefMessage(getSyncReliefMessage(plan, capturedItem));
    resetPreview();
    setPrompt("");
  };

  const handleDismissPreview = () => {
    resetPreview();
    setReliefMessage(null);
  };

  const handleChangeTime = () => {
    resetPreview();
    setReliefMessage("Adjust the time in your message and try again.");
    inputRef.current?.focus();
  };

  const handleToggleDestination = (destination: SyncDestination) => {
    setSelectedDestinations((current) =>
      current.includes(destination)
        ? current.filter((item) => item !== destination)
        : [...current, destination],
    );
  };

  const handleSelectAmbiguity = (
    interpretation: AmbiguityChoices["interpretations"][number],
  ) => {
    const payload = interpretation.payload;
    if (
      payload &&
      typeof payload === "object" &&
      "needsClarification" in payload
    ) {
      return;
    }

    setAmbiguityChoices(null);

    if (interpretation.intent === "create" && payload && typeof payload === "object" && "plan" in payload) {
      const nextPlan = payload.plan as PulsePlan;
      setPlan(nextPlan);
      setFlow(
        nextPlan.category === "work-schedule" &&
          nextPlan.timeline?.kind === "recurring"
          ? { kind: "schedule-save" }
          : { kind: "create" },
      );
      setSelectedDestinations(resolveSyncDestinations(nextPlan));
      setReliefMessage(null);
      return;
    }

    if (
      interpretation.intent === "edit" &&
      payload &&
      typeof payload === "object" &&
      "commandIntent" in payload
    ) {
      const commandIntent = payload.commandIntent as Extract<
        SyncCommandIntent,
        { type: "edit" }
      >;
      const reference = resolveCaptureReference({
        commandText: prompt,
        items: activeItems,
      });
      if (!reference.target) {
        setReliefMessage("I couldn't find a matching item to update.");
        return;
      }
      const nextPlan = buildEditPlanFromCommand(
        reference.target,
        commandIntent,
        prompt,
        { userContext: timelineOptions.userContext },
      );
      setPlan(nextPlan);
      setFlow({
        kind: "edit",
        targetId: reference.target.id,
        commandIntent,
      });
      setSelectedDestinations(sanitizeSyncDestinations(reference.target.destinations));
      setReliefMessage(null);
    }
  };

  const handleSelectActionChoice = (item: CapturedSyncItem) => {
    if (!actionChoices) return;
    const commandIntent = actionChoices.commandIntent;
    setActionChoices(null);

    if (actionChoices.intent === "delete" && commandIntent.type === "delete") {
      setPlan(
        createPulsePlan(prompt, {
          timeline: timelineOptions,
        }),
      );
      setFlow({ kind: "delete", targets: [item] });
      setSelectedDestinations([]);
      setReliefMessage(null);
      return;
    }

    if (actionChoices.intent === "edit" && commandIntent.type === "edit") {
      const nextPlan = buildEditPlanFromCommand(
        item,
        commandIntent,
        prompt,
        { userContext: timelineOptions.userContext },
      );
      setPlan(nextPlan);
      setFlow({ kind: "edit", targetId: item.id, commandIntent });
      setSelectedDestinations(sanitizeSyncDestinations(item.destinations));
      setReliefMessage(null);
    }
  };

  function itemMeta(item: CapturedSyncItem) {
    return [item.dateLabel, item.timeLabel]
      .filter((value) => value && value !== "Flexible" && value !== "Upcoming")
      .join(" · ");
  }

  function previewWhenText() {
    if (!preview) return "";
    const time = [preview.when.startTime, preview.when.endTime]
      .filter(Boolean)
      .join(" – ");
    return [preview.when.label, time].filter(Boolean).join(" ");
  }

  const editTarget =
    flow.kind === "edit"
      ? activeItems.find((item) => item.id === flow.targetId)
      : null;

  const editPreview =
    editTarget && preview
      ? {
          title: editTarget.title,
          from: itemMeta(editTarget),
          to: previewWhenText(),
        }
      : undefined;

  const handleStarterChip = (text: string) => {
    setPrompt(text);
    if (inputRef.current) {
      inputRef.current.value = text;
      inputRef.current.focus();
    }
    generatePreview(text);
  };

  const rotatingPlaceholder = STARTER_CHIPS[placeholderIndex]?.label
    ? `Try: ${STARTER_CHIPS[placeholderIndex].label}`
    : INPUT_PLACEHOLDER;

  return (
    <div
      className={
        isHome
          ? "flex w-full flex-col items-center"
          : "flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-7"
      }
    >
      <section className="w-full">
        <form
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-[1.75rem] border border-border/35 bg-card/55 p-2.5 shadow-[0_24px_80px_-52px_var(--foreground)] backdrop-blur-sm sm:flex-row sm:items-center"
          onSubmit={handlePreviewSubmit}
        >
          <div className="flex min-h-[3.4rem] flex-1 items-center gap-2 rounded-[1.35rem] bg-background/35 px-4">
            <div className="relative min-w-0 flex-1">
              {!prompt && (
                <span
                  key={isHome ? "home-placeholder" : rotatingPlaceholder}
                  className="sync-placeholder-example pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 truncate text-[16px] text-muted-foreground/48"
                  aria-hidden
                >
                  {isHome ? INPUT_PLACEHOLDER : rotatingPlaceholder}
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder=""
                className="relative z-10 h-12 w-full min-w-0 bg-transparent text-[16px] text-foreground/92 outline-none"
                aria-label="Sync prompt"
              />
            </div>
            <button
              type="button"
              aria-label="Audio capture coming soon"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/55 transition-colors hover:bg-muted/40 hover:text-foreground/80"
            >
              <Mic className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          <Button
            type="submit"
            className="h-12 min-h-[48px] shrink-0 px-5 text-[15px] sm:h-[3.4rem] sm:min-h-0"
          >
            Synchronize
          </Button>
        </form>

        {isHome && !plan && (
          <div className="mx-auto mt-4 w-full max-w-2xl">
            <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
              Try an example
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleStarterChip(chip.prompt)}
                  className="rounded-full border border-border/25 bg-muted/10 px-3 py-1.5 text-[12px] font-medium text-muted-foreground/70 transition-colors hover:border-primary/20 hover:bg-primary/8 hover:text-foreground/82"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {ambiguityChoices && (
          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-border/25 bg-card/35 p-4">
            <p className="text-[14px] font-medium text-foreground/85">
              Sync needs your help
            </p>
            {ambiguityChoices.reason && (
              <p className="mt-1 text-[13px] text-muted-foreground/68">
                {ambiguityChoices.reason}
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {ambiguityChoices.interpretations.map((interpretation) => {
                const needsClarification =
                  typeof interpretation.payload === "object" &&
                  interpretation.payload !== null &&
                  "needsClarification" in interpretation.payload;

                return (
                  <li key={interpretation.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectAmbiguity(interpretation)}
                      disabled={needsClarification}
                      className="w-full rounded-xl border border-border/20 px-3 py-2 text-left text-[14px] hover:bg-muted/15 disabled:cursor-default disabled:opacity-70"
                    >
                      {interpretation.label}
                      <span className="mt-0.5 block text-[12px] text-muted-foreground/60">
                        {interpretation.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {actionChoices && (
          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-border/25 bg-card/35 p-4">
            <p className="text-[14px] text-muted-foreground/75">
              Which one did you mean?
            </p>
            <ul className="mt-3 space-y-2">
              {actionChoices.targets.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectActionChoice(item)}
                    className="w-full rounded-xl border border-border/20 px-3 py-2 text-left text-[14px] hover:bg-muted/15"
                  >
                    {formatReferenceCandidateLabel(item)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reliefMessage && (
          <p
            className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-muted-foreground/72"
            aria-live="polite"
          >
            {reliefMessage}
          </p>
        )}

        {plan && preview && (
          <SyncPreviewPanel
            plan={plan}
            preview={preview}
            selectedDestinations={sanitizeSyncDestinations(selectedDestinations)}
            editPreview={editPreview}
            onToggleDestination={
              flow.kind === "create" ||
              flow.kind === "edit" ||
              flow.kind === "schedule-save" ||
              flow.kind === "schedule-update"
                ? handleToggleDestination
                : undefined
            }
            onConfirm={handleSavePlan}
            onProtectTime={handleProtectTime}
            onSuggestedAction={handleSuggestedAction}
            onDismiss={handleDismissPreview}
            onChangeTime={handleChangeTime}
            onUpdateExisting={
              flow.kind === "duplicate" ? handleUpdateExisting : undefined
            }
            onKeepBoth={flow.kind === "duplicate" ? handleKeepBoth : undefined}
            disableConfirm={
              (flow.kind === "create" &&
                (plan.status !== "draft" || selectedDestinations.length === 0)) ||
              ((flow.kind === "schedule-save" || flow.kind === "schedule-update") &&
                selectedDestinations.length === 0)
            }
            confirmLabel={
              flow.kind === "delete"
                ? "Remove"
                : flow.kind === "edit"
                  ? "Update"
                  : undefined
            }
          />
        )}
      </section>

      {process.env.NODE_ENV !== "production" && <TimelineDebugPanel />}
    </div>
  );
}
