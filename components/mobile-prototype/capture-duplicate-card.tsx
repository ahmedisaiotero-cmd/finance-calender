"use client";

import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import type { CapturePreview } from "@/lib/mobile-prototype/build-capture-preview";
import {
  CAPTURE_ALREADY_REMEMBERED,
  CAPTURE_CANCEL,
  CAPTURE_SAVE_ANYWAY,
  CAPTURE_VIEW_EXISTING,
} from "@/lib/mobile-prototype/sync-voice";

type CaptureDuplicateCardProps = {
  preview: CapturePreview;
  viewTarget: LifeDrilldownTarget | null;
  onViewExisting: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
};

export function CaptureDuplicateCard({
  preview,
  viewTarget,
  onViewExisting,
  onSaveAnyway,
  onCancel,
}: CaptureDuplicateCardProps) {
  return (
    <div
      className="sync-capture-preview sync-capture-preview--duplicate"
      role="region"
      aria-label="Existing memory"
    >
      <p className="sync-capture-preview-headline">{CAPTURE_ALREADY_REMEMBERED}</p>
      <p className="sync-capture-preview-title">{preview.title}</p>
      <p className="sync-capture-preview-area">{preview.areaLine}</p>
      <p className="sync-capture-preview-detail">{preview.detail}</p>
      <div className="sync-capture-preview-actions">
        {viewTarget && (
          <button
            type="button"
            className="sync-capture-preview-action sync-capture-preview-action--primary"
            onClick={onViewExisting}
          >
            {CAPTURE_VIEW_EXISTING}
          </button>
        )}
        <button
          type="button"
          className="sync-capture-preview-action"
          onClick={onSaveAnyway}
        >
          {CAPTURE_SAVE_ANYWAY}
        </button>
        <button
          type="button"
          className="sync-capture-preview-action"
          onClick={onCancel}
        >
          {CAPTURE_CANCEL}
        </button>
      </div>
    </div>
  );
}
