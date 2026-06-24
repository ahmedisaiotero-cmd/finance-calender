"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import type { CapturedSyncItem } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { CaptureDuplicateCard } from "@/components/mobile-prototype/capture-duplicate-card";
import { CapturePreviewCard } from "@/components/mobile-prototype/capture-preview-card";
import { CaptureVoiceButton } from "@/components/mobile-prototype/capture-voice-button";
import type { CapturePreview } from "@/lib/mobile-prototype/build-capture-preview";
import { itemSnapshotFromPrepared } from "@/lib/mobile-prototype/build-capture-preview";
import {
  attemptBriefCapture,
  commitPreparedCapture,
} from "@/lib/mobile-prototype/capture-brief-input";
import {
  buildCaptureConfirmation,
  type CaptureConfirmation,
} from "@/lib/mobile-prototype/build-capture-confirmation";
import {
  previewCaptureInput,
} from "@/lib/mobile-prototype/preview-capture-input";
import {
  buildDailyBrief,
  formatBriefDate,
  greetingForHour,
} from "@/lib/mobile-prototype/build-daily-brief";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import type { TodayBriefLine } from "@/lib/mobile-prototype/build-today-view";
import type { SyncCaptureInput } from "@/lib/sync-capture/capture-source";
import {
  captureSourceMetadata,
  resolveCaptureText,
} from "@/lib/sync-capture/capture-source";
import type { PreparedCapture } from "@/lib/sync-capture/save-capture";
import type { CaptureSourceMetadata } from "@/lib/sync-capture/capture-source";
import {
  BRIEF_LOADING,
  CAPTURE_COMPACT_PLACEHOLDER,
  CAPTURE_FOLLOWUP_PLACEHOLDER,
  CAPTURE_PREVIEW,
  CAPTURE_SAVE_FAILED,
} from "@/lib/mobile-prototype/sync-voice";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type ClientClock = {
  dateTime: string;
  dateLabel: string;
  greeting: string;
};

type PendingCapture = {
  preview: CapturePreview;
  prepared: PreparedCapture;
  inputText: string;
  sourceMeta: CaptureSourceMetadata;
};

type PendingDuplicate = {
  existing: CapturePreview;
  viewTarget: LifeDrilldownTarget | null;
  prepared: PreparedCapture;
  inputText: string;
  sourceMeta: CaptureSourceMetadata;
};

function BriefingLink({
  line,
  onOpen,
}: {
  line: TodayBriefLine;
  onOpen: (target: LifeDrilldownTarget) => void;
}) {
  if (!line.drilldown) {
    return <span className="sync-brief-static">{line.text}</span>;
  }

  return (
    <button
      type="button"
      className="sync-brief-link"
      onClick={() => onOpen(line.drilldown!)}
    >
      {line.text}
    </button>
  );
}

export function TodayScreen({
  onOpenTarget,
}: {
  onOpenTarget: (target: LifeDrilldownTarget) => void;
}) {
  const {
    activeItems,
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  } = useCapturedItems();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [clientClock, setClientClock] = useState<ClientClock | null>(null);
  const [input, setInput] = useState("");
  const [captureExpanded, setCaptureExpanded] = useState(false);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<{
    message: string;
    suggestions: string[];
  } | null>(null);
  const [pendingPreview, setPendingPreview] = useState<PendingCapture | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<PendingDuplicate | null>(null);
  const [confirmation, setConfirmation] = useState<CaptureConfirmation | null>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reference = useMemo(() => new Date(), [mounted, activeItems.length]);

  const brief = useMemo(() => {
    if (!mounted) {
      return {
        userName: null,
        lede: BRIEF_LOADING,
        sections: [],
        isEmpty: true,
        consequences: [],
      };
    }

    return buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      lifeProfile: loadLifeProfile(),
      reference,
    });
  }, [mounted, activeItems, reference]);

  const todayView = useMemo(
    () =>
      buildTodayView({
        brief,
        consequences: brief.consequences ?? [],
        items: activeItems,
        reference,
        workSchedule: loadActiveWorkSchedule() ?? null,
      }),
    [brief, activeItems, reference],
  );

  useEffect(() => {
    if (!mounted) return;

    const now = new Date();
    setClientClock({
      dateTime: now.toISOString(),
      dateLabel: formatBriefDate(now),
      greeting: greetingForHour(now.getHours()),
    });
  }, [mounted]);

  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setTimeout(() => setConfirmation(null), 5000);
    return () => window.clearTimeout(timer);
  }, [confirmation]);

  const captureContext = () => ({
    items: activeItems,
    workSchedule: loadActiveWorkSchedule() ?? null,
    reference,
  });

  const captureHandlers = {
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  };

  const finishSavedCapture = (
    itemSnapshot: CapturedSyncItem,
    sourceMeta: CaptureSourceMetadata,
    overlapNotice?: string,
  ) => {
    const snapshot = {
      ...itemSnapshot,
      captureSource: sourceMeta.captureSource,
      voiceTranscript: sourceMeta.voiceTranscript,
    };

    const nextItems = [
      snapshot,
      ...activeItems.filter((item) => item.id !== snapshot.id),
    ];

    setConfirmation(
      buildCaptureConfirmation(snapshot, {
        reference,
        consequences: buildDailyBrief({
          items: nextItems,
          workSchedule: loadActiveWorkSchedule() ?? null,
          lifeProfile: loadLifeProfile(),
          reference,
        }).consequences,
      }),
    );
    if (overlapNotice) {
      setCaptureNotice(overlapNotice);
    }
    setInput("");
    setDraftText(null);
    setFollowUp(null);
    setPendingPreview(null);
    setPendingDuplicate(null);
    setCaptureExpanded(false);
  };

  const runDirectCapture = (captureInput: SyncCaptureInput | string) => {
    const trimmed = resolveCaptureText(captureInput);
    if (!trimmed) return;

    setCaptureNotice(null);
    const sourceMeta = captureSourceMetadata(captureInput);

    const attempt = attemptBriefCapture(
      typeof captureInput === "string"
        ? trimmed
        : { text: trimmed, ...sourceMeta },
      captureContext(),
      captureHandlers,
    );

    if (attempt.status === "empty") {
      setCaptureNotice(CAPTURE_SAVE_FAILED);
      return;
    }

    if (attempt.status === "too_vague") {
      setCaptureNotice(attempt.message);
      return;
    }

    if (attempt.status === "duplicate") {
      setCaptureNotice(attempt.message);
      setInput("");
      setDraftText(null);
      setFollowUp(null);
      setPendingPreview(null);
      setCaptureExpanded(false);
      return;
    }

    if (attempt.status === "saved" && attempt.kind === "create") {
      finishSavedCapture(
        {
          id: attempt.result.plan.id,
          title: attempt.result.title,
          category: attempt.result.plan.category,
          prompt: attempt.result.plan.prompt,
          originalPrompt: attempt.result.plan.originalPrompt,
          destinations: attempt.result.destinations,
          dateLabel: attempt.result.plan.dateLabel,
          timeLabel: attempt.result.plan.timeLabel,
          timeline: attempt.result.plan.timeline,
          workAvailability: attempt.result.plan.parsedInput?.workAvailability,
          moneyType: attempt.result.plan.parsedInput?.moneyType,
          status: "active",
          createdAt: attempt.result.plan.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        sourceMeta,
        attempt.overlapNotice,
      );
      return;
    }

    if (attempt.status === "saved") {
      setInput("");
      setPendingPreview(null);
      setCaptureExpanded(false);
      return;
    }

    setDraftText(attempt.draftText);
    setFollowUp({
      message: attempt.message,
      suggestions: attempt.suggestions,
    });
    setCaptureExpanded(true);
    setInput("");
  };

  const handlePreview = (captureInput: SyncCaptureInput | string) => {
    const trimmed = resolveCaptureText(captureInput);
    if (!trimmed) return;

    setCaptureNotice(null);
    setConfirmation(null);

    const result = previewCaptureInput(captureInput, captureContext());

    if (result.status === "empty") return;

    if (result.status === "too_vague") {
      setCaptureNotice(result.message);
      setPendingPreview(null);
      return;
    }

    if (result.status === "duplicate") {
      setPendingDuplicate({
        existing: result.existing,
        viewTarget: result.viewTarget,
        prepared: result.prepared,
        inputText: result.inputText,
        sourceMeta: result.sourceMeta,
      });
      setPendingPreview(null);
      setCaptureExpanded(true);
      return;
    }

    if (result.status === "command") {
      runDirectCapture(captureInput);
      return;
    }

    setPendingPreview({
      preview: result.preview,
      prepared: result.prepared,
      inputText: result.inputText,
      sourceMeta: result.sourceMeta,
    });
    setCaptureExpanded(true);
  };

  const handleRemember = () => {
    if (!pendingPreview) return;

    const attempt = commitPreparedCapture(
      pendingPreview.prepared,
      captureContext(),
      pendingPreview.sourceMeta,
      captureHandlers,
    );

    if (attempt.status === "duplicate") {
      setCaptureNotice(attempt.message);
      setPendingPreview(null);
      return;
    }

    if (attempt.status === "saved" && attempt.kind === "create") {
      finishSavedCapture(
        itemSnapshotFromPrepared(pendingPreview.prepared, pendingPreview.sourceMeta),
        pendingPreview.sourceMeta,
        attempt.overlapNotice,
      );
    }
  };

  const handleSaveAnyway = () => {
    if (!pendingDuplicate) return;

    const attempt = commitPreparedCapture(
      pendingDuplicate.prepared,
      captureContext(),
      pendingDuplicate.sourceMeta,
      captureHandlers,
      { skipDuplicateCheck: true, forceNewId: true },
    );

    if (attempt.status === "saved" && attempt.kind === "create") {
      finishSavedCapture(
        {
          ...itemSnapshotFromPrepared(pendingDuplicate.prepared, pendingDuplicate.sourceMeta),
          id: attempt.result.plan.id,
        },
        pendingDuplicate.sourceMeta,
        attempt.overlapNotice,
      );
    }
  };

  const handleViewExisting = () => {
    if (!pendingDuplicate?.viewTarget) return;
    onOpenTarget(pendingDuplicate.viewTarget);
    setPendingDuplicate(null);
  };

  const handleCancelDuplicate = () => {
    setPendingDuplicate(null);
  };

  const handleEditPreview = () => {
    if (!pendingPreview) return;
    setInput(pendingPreview.inputText);
    setPendingPreview(null);
    setCaptureExpanded(true);
    queueMicrotask(() => inputRef.current?.focus());
  };

  const handleCancelPreview = () => {
    setPendingPreview(null);
  };

  const applySuggestion = (suggestion: string) => {
    const base = draftText ?? input;
    if (!base.trim()) return;
    handlePreview(`${base.trim()} ${suggestion}`);
  };

  const handleSubmit = () => {
    if (followUp && draftText) {
      handlePreview(`${draftText} ${input}`.trim());
      return;
    }
    handlePreview(input);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (captureNotice) setCaptureNotice(null);
    if (pendingPreview && value.trim() !== pendingPreview.inputText.trim()) {
      setPendingPreview(null);
    }
    if (pendingDuplicate && value.trim() !== pendingDuplicate.inputText.trim()) {
      setPendingDuplicate(null);
    }
  };

  return (
    <article className="sync-brief-screen sync-brief-screen--home mobile-prototype-pad-x">
      <div className="sync-brief-stack">
        <header className="sync-brief-head">
          {clientClock ? (
            <time className="sync-brief-date" dateTime={clientClock.dateTime}>
              {clientClock.dateLabel}
            </time>
          ) : (
            <p className="sync-brief-date" aria-hidden="true">
              &nbsp;
            </p>
          )}

          <h1 className="sync-brief-greeting mobile-prototype-display">
            {clientClock?.greeting ?? "Good day."}
          </h1>
        </header>

        <div className="sync-brief-body">
          {todayView.reflection && (
            <p className="sync-brief-reflection-line">
              {todayView.reflection.drilldown ? (
                <BriefingLink
                  line={todayView.reflection}
                  onOpen={onOpenTarget}
                />
              ) : (
                todayView.reflection.text
              )}
            </p>
          )}
          <p className="sync-brief-lede mobile-prototype-display">
            <BriefingLink
              line={todayView.primaryPriority}
              onOpen={onOpenTarget}
            />
          </p>
          {todayView.supportingPriorities.map((line, index) => (
            <p
              key={`${line.text}-${index}`}
              className="sync-brief-detail-line"
            >
              <BriefingLink line={line} onOpen={onOpenTarget} />
            </p>
          ))}
          {todayView.futureContext && (
            <div className="sync-brief-forecast">
              <p className="sync-brief-forecast-line">
                {todayView.futureContext.drilldown ? (
                  <BriefingLink
                    line={todayView.futureContext}
                    onOpen={onOpenTarget}
                  />
                ) : (
                  todayView.futureContext.text
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <section
        className={`sync-brief-capture sync-brief-capture--home${captureExpanded ? " sync-brief-capture--expanded" : ""}`}
        aria-label="Tell Sync something"
      >
        <div className="sync-brief-capture-field sync-brief-capture-field--compact">
          <div className="sync-brief-capture-row">
            {captureExpanded ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                id="sync-brief-capture-input"
                aria-label="Tell Sync something"
                value={input}
                onChange={(event) => handleInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !pendingPreview) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  followUp
                    ? CAPTURE_FOLLOWUP_PLACEHOLDER
                    : CAPTURE_COMPACT_PLACEHOLDER
                }
                rows={2}
                className="sync-brief-capture-input sync-brief-capture-input--compact"
                autoFocus
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                id="sync-brief-capture-input"
                type="text"
                aria-label="Tell Sync something"
                value={input}
                onChange={(event) => handleInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !pendingPreview) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                onFocus={() => setCaptureExpanded(true)}
                placeholder={CAPTURE_COMPACT_PLACEHOLDER}
                className="sync-brief-capture-input sync-brief-capture-input--compact"
              />
            )}
            <CaptureVoiceButton
              onInterimTranscript={(text) => {
                handleInputChange(text);
                setCaptureExpanded(true);
              }}
              onFinalTranscript={(transcript) => {
                handlePreview({
                  text: transcript,
                  source: "voice",
                  transcript,
                });
              }}
              onError={(message) => setCaptureNotice(message)}
            />
            {(captureExpanded || input.trim()) && !pendingPreview && !pendingDuplicate && (
              <button
                type="button"
                className="sync-brief-capture-submit sync-brief-capture-submit--compact"
                disabled={!input.trim() && !(followUp && draftText)}
                onClick={handleSubmit}
                aria-label={CAPTURE_PREVIEW}
              >
                {CAPTURE_PREVIEW}
              </button>
            )}
          </div>
        </div>

        {pendingDuplicate && (
          <CaptureDuplicateCard
            preview={pendingDuplicate.existing}
            viewTarget={pendingDuplicate.viewTarget}
            onViewExisting={handleViewExisting}
            onSaveAnyway={handleSaveAnyway}
            onCancel={handleCancelDuplicate}
          />
        )}

        {pendingPreview && (
          <CapturePreviewCard
            preview={pendingPreview.preview}
            onRemember={handleRemember}
            onEdit={handleEditPreview}
            onCancel={handleCancelPreview}
          />
        )}

        {followUp && captureExpanded && !pendingPreview && !pendingDuplicate && (
          <div className="sync-brief-capture-followup">
            <p className="sync-brief-capture-notice" role="status">
              {followUp.message}
            </p>
            {draftText && <p className="sync-capture-draft">&ldquo;{draftText}&rdquo;</p>}
            <div className="sync-capture-suggestions">
              {followUp.suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  className="sync-capture-chip"
                  onClick={() => applySuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {captureNotice && (
          <p className="sync-brief-capture-notice" role="status">
            {captureNotice}
          </p>
        )}

        {confirmation && !pendingPreview && !pendingDuplicate && (
          <div className="sync-brief-capture-confirmation" role="status">
            <p className="sync-brief-capture-confirmation-headline">
              {confirmation.headline}
            </p>
            {confirmation.target ? (
              <button
                type="button"
                className="sync-brief-capture-confirmation-link"
                onClick={() => onOpenTarget(confirmation.target!)}
              >
                {confirmation.line}
              </button>
            ) : (
              <p className="sync-brief-capture-confirmation-line">
                {confirmation.line}
              </p>
            )}
            {confirmation.detail && (
              <p className="sync-brief-capture-confirmation-detail">
                {confirmation.detail}
              </p>
            )}
          </div>
        )}
      </section>
    </article>
  );
}
