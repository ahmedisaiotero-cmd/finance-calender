"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import type { SyncDestination } from "@/lib/captured-items";
import { logSyncPreviewDebug } from "@/lib/pulse/sync-preview-debug";
import {
  getDestinationChipLabels,
  type SyncPreviewViewModel,
} from "@/lib/pulse/sync-preview-view-model";
import type { PulsePlan } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

type SyncPreviewPanelProps = {
  plan: PulsePlan;
  preview: SyncPreviewViewModel;
  selectedDestinations: SyncDestination[];
  onToggleDestination: (destination: SyncDestination) => void;
  onSave: () => void;
  onDismiss: () => void;
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

export function SyncPreviewPanel({
  plan,
  preview,
  selectedDestinations,
  onToggleDestination,
  onSave,
  onDismiss,
}: SyncPreviewPanelProps) {
  const destinationChips = getDestinationChipLabels(preview);
  const whenTime = formatWhenTime(preview);

  useEffect(() => {
    logSyncPreviewDebug(plan, preview, selectedDestinations);
  }, [plan, preview, selectedDestinations]);

  return (
    <article className="pulse-organizer-plan mx-auto mt-5 max-w-2xl rounded-[1.15rem] bg-card/45 p-5 sm:p-6">
      {preview.confidence.needsConfirmation && (
        <p className="mb-4 text-[13px] font-medium text-primary/80">
          Sync thinks you meant...
        </p>
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

        <PreviewSection label="When">
          <p className="text-[15px] font-medium text-foreground/88">
            {preview.when.label}
          </p>
          {whenTime && (
            <p className="text-[14px] text-muted-foreground/72">{whenTime}</p>
          )}
          {!whenTime && preview.when.date && (
            <p className="text-[14px] text-muted-foreground/72">
              {preview.when.date}
            </p>
          )}
        </PreviewSection>

        <PreviewSection label="Goes to">
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
        </PreviewSection>

        <PreviewSection label="Why it matters">
          <p className="text-[14px] leading-relaxed text-muted-foreground/72">
            {preview.why.summary}
          </p>
          {preview.why.suggestedActions &&
            preview.why.suggestedActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.why.suggestedActions.slice(0, 2).map((action) => (
                  <span
                    key={action.label}
                    className="rounded-full border border-border/25 bg-muted/10 px-3 py-1 text-[12px] text-muted-foreground/68"
                  >
                    {action.label}
                  </span>
                ))}
              </div>
            )}
        </PreviewSection>
      </div>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button
          type="button"
          onClick={onSave}
          disabled={plan.status !== "draft" || selectedDestinations.length === 0}
          className="h-11"
        >
          Synchronize
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onDismiss}
          className="h-11 text-muted-foreground/72"
        >
          Dismiss
        </Button>
      </div>
    </article>
  );
}
