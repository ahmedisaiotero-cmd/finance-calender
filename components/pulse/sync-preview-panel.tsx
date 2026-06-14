"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import type { SyncDestination } from "@/lib/captured-items";
import type { MeaningActionType } from "@/lib/intelligence/meaning-engine";
import { logSyncPreviewDebug } from "@/lib/pulse/sync-preview-debug";
import {
  getDestinationChipLabels,
  type SyncPreviewMode,
  type SyncPreviewViewModel,
} from "@/lib/pulse/sync-preview-view-model";
import type { PulsePlan } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

type SyncPreviewPanelProps = {
  plan: PulsePlan;
  preview: SyncPreviewViewModel;
  selectedDestinations: SyncDestination[];
  editPreview?: {
    title: string;
    from: string;
    to: string;
  };
  onToggleDestination?: (destination: SyncDestination) => void;
  onConfirm: () => void;
  onProtectTime?: () => void;
  onSuggestedAction?: (actionType: MeaningActionType) => void;
  onDismiss: () => void;
  onChangeTime?: () => void;
  onUpdateExisting?: () => void;
  onKeepBoth?: () => void;
  confirmLabel?: string;
  disableConfirm?: boolean;
};

function formatWhenTime(preview: SyncPreviewViewModel): string | null {
  const { startTime, endTime } = preview.when;
  if (!startTime && !endTime) return null;
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  return startTime ?? endTime ?? null;
}

function PreviewSection({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
        {label}
      </p>
      {children}
    </div>
  );
}

function defaultConfirmLabel(mode: SyncPreviewMode) {
  if (mode === "schedule-delete") return "Remove Schedule";
  if (mode === "schedule-update") return "Update Schedule";
  if (mode === "schedule-save") return "Save Schedule";
  if (mode === "delete") return "Remove";
  if (mode === "edit") return "Update";
  if (mode === "duplicate") return "Keep Both";
  return "Save";
}

export function SyncPreviewPanel({
  plan,
  preview,
  selectedDestinations,
  editPreview,
  onToggleDestination,
  onConfirm,
  onProtectTime,
  onSuggestedAction,
  onDismiss,
  onChangeTime,
  onUpdateExisting,
  onKeepBoth,
  confirmLabel,
  disableConfirm = false,
}: SyncPreviewPanelProps) {
  const destinationChips = getDestinationChipLabels(preview);
  const whenTime = formatWhenTime(preview);
  const hasOverlap = Boolean(preview.when.overlap);
  const isDelete =
    preview.mode === "delete" || preview.mode === "schedule-delete";
  const isDuplicate = preview.mode === "duplicate";
  const canEditDestinations =
    preview.mode === "create" ||
    preview.mode === "edit" ||
    preview.mode === "schedule-save" ||
    preview.mode === "schedule-update";
  const showProtectTime =
    preview.meaning?.protection.eligible &&
    preview.mode === "create" &&
    onProtectTime;
  const secondaryActions =
    preview.why.suggestedActions?.filter(
      (action) =>
        action.actionType !== "protect_time" && action.actionType !== "none",
    ) ?? [];

  useEffect(() => {
    logSyncPreviewDebug(plan, preview, selectedDestinations);
  }, [plan, preview, selectedDestinations]);

  return (
    <article className="pulse-organizer-plan mx-auto mt-5 max-w-2xl rounded-[1.15rem] bg-card/45 p-5 sm:p-6">
      {preview.banner && (
        <p
          className={cn(
            "mb-4 text-[13px] font-medium",
            preview.readyToSave
              ? "text-emerald-600/85 dark:text-emerald-400/85"
              : "text-primary/80",
          )}
        >
          {preview.banner}
        </p>
      )}

      {preview.mode === "edit" && editPreview && (
        <div className="mb-5 rounded-2xl border border-border/25 bg-background/25 p-4">
          <p className="text-[13px] font-medium text-muted-foreground/72">
            Sync thinks you want to update:
          </p>
          <p className="mt-2 text-[17px] font-medium tracking-[-0.03em] text-foreground/95">
            {editPreview.title}
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground/72">
            {editPreview.from || "Current timing"}
          </p>
          <p className="my-2 text-[18px] leading-none text-muted-foreground/45">↓</p>
          <p className="text-[14px] font-medium text-foreground/85">
            {editPreview.to || "Updated timing"}
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <PreviewSection label="What">
          <p className="text-[18px] font-medium tracking-[-0.03em] text-foreground/95">
            {preview.what.title}
          </p>
          {preview.what.subtitle && (
            <p className="text-[14px] text-muted-foreground/68">
              {preview.what.subtitle}
            </p>
          )}
        </PreviewSection>

        {!isDelete && (
          <PreviewSection label="When">
            <p className="text-[15px] font-medium text-foreground/88">
              {preview.when.label}
            </p>
            {whenTime && (
              <p className="text-[14px] text-muted-foreground/72">{whenTime}</p>
            )}
            {hasOverlap && preview.when.overlap && (
              <div
                className={cn(
                  "mt-2 rounded-xl border p-3",
                  preview.when.overlap.severity === "important"
                    ? "border-amber-500/30 bg-amber-500/8"
                    : "border-amber-500/20 bg-amber-500/5",
                )}
              >
                <p className="text-[13px] font-medium text-amber-800/90 dark:text-amber-300/90">
                  {preview.when.overlap.headline}
                </p>
                {preview.when.overlap.conflictMeaning && (
                  <p className="mt-1 text-[13px] text-muted-foreground/75">
                    {preview.when.overlap.conflictMeaning}
                  </p>
                )}
                <p className="mt-1 text-[13px] text-muted-foreground/75">
                  {preview.when.overlap.existingTitle}:{" "}
                  {preview.when.overlap.existingRange}
                </p>
              </div>
            )}
            {!whenTime && preview.when.date && (
              <p className="text-[14px] text-muted-foreground/72">
                {preview.when.date}
              </p>
            )}
          </PreviewSection>
        )}

        {!isDelete && (
          <PreviewSection label="Goes to">
            {canEditDestinations && onToggleDestination ? (
              <div className="flex flex-wrap gap-2">
                {destinationChips.map((destination) => {
                  const selected = selectedDestinations.includes(destination);

                  return (
                    <button
                      key={destination}
                      type="button"
                      onClick={() => onToggleDestination(destination)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                        selected
                          ? "border-primary/30 bg-primary/10 text-foreground/90"
                          : "border-border/30 bg-muted/15 text-muted-foreground/65 hover:text-foreground/80",
                      )}
                      aria-pressed={selected}
                    >
                      {destination}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[14px] text-muted-foreground/72">
                {destinationChips.join(" · ")}
              </p>
            )}
          </PreviewSection>
        )}

        <PreviewSection label={isDelete ? "What happens" : "Why it matters"}>
          {preview.why.importanceLabel && !isDelete && (
            <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground/55">
              {preview.why.importanceLabel}
            </p>
          )}
          <p className="text-[14px] leading-relaxed text-muted-foreground/72">
            {isDelete
              ? "This will be removed from your calendar and life areas. You can always capture it again."
              : preview.why.summary}
          </p>
          {preview.why.protectionRecommendation && !isDelete && (
            <p className="mt-2 text-[13px] text-primary/75">
              {preview.why.protectionRecommendation}
            </p>
          )}
        </PreviewSection>
      </div>

      {!isDelete && secondaryActions.length > 0 && (
        <PreviewSection label="Suggested actions" className="mt-5">
          <div className="flex flex-col gap-2">
            {secondaryActions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onSuggestedAction?.(action.actionType)}
                className="rounded-xl border border-border/25 px-3 py-2 text-left text-[13px] text-foreground/82 transition-colors hover:bg-muted/20"
              >
                {action.label}
              </button>
            ))}
          </div>
        </PreviewSection>
      )}

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {isDuplicate && onUpdateExisting && (
          <Button type="button" onClick={onUpdateExisting} className="h-11">
            Update Existing
          </Button>
        )}
        {hasOverlap ? (
          <>
            <Button
              type="button"
              onClick={isDuplicate && onKeepBoth ? onKeepBoth : onConfirm}
              disabled={disableConfirm}
              className="h-11"
            >
              Save anyway
            </Button>
            {showProtectTime && (
              <Button
                type="button"
                variant="outline"
                onClick={onProtectTime}
                className="h-11"
              >
                Protect time
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onChangeTime ?? onDismiss}
              className="h-11"
            >
              Change time
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDismiss}
              className="h-11 text-muted-foreground/72"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={isDuplicate && onKeepBoth ? onKeepBoth : onConfirm}
              disabled={disableConfirm}
              className="h-11"
            >
              {confirmLabel ?? defaultConfirmLabel(preview.mode)}
            </Button>
            {showProtectTime && (
              <Button
                type="button"
                variant="outline"
                onClick={onProtectTime}
                className="h-11"
              >
                Protect time
              </Button>
            )}
            {onChangeTime && preview.when.isTimed && (
              <Button
                type="button"
                variant="outline"
                onClick={onChangeTime}
                className="h-11"
              >
                Change time
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={onDismiss}
              className="h-11 text-muted-foreground/72"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
