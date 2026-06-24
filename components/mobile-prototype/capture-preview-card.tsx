"use client";

import type { CapturePreview } from "@/lib/mobile-prototype/build-capture-preview";
import {
  CAPTURE_CANCEL,
  CAPTURE_EDIT,
  CAPTURE_REMEMBER,
  CAPTURE_UNDERSTOOD,
} from "@/lib/mobile-prototype/sync-voice";

type CapturePreviewCardProps = {
  preview: CapturePreview;
  onRemember: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

export function CapturePreviewCard({
  preview,
  onRemember,
  onEdit,
  onCancel,
}: CapturePreviewCardProps) {
  return (
    <div className="sync-capture-preview" role="region" aria-label="Capture preview">
      <p className="sync-capture-preview-headline">{CAPTURE_UNDERSTOOD}</p>
      <p className="sync-capture-preview-title">{preview.title}</p>
      <p className="sync-capture-preview-area">{preview.areaLine}</p>
      <p className="sync-capture-preview-detail">{preview.detail}</p>
      <div className="sync-capture-preview-actions">
        <button
          type="button"
          className="sync-capture-preview-action sync-capture-preview-action--primary"
          onClick={onRemember}
        >
          {CAPTURE_REMEMBER}
        </button>
        <button
          type="button"
          className="sync-capture-preview-action"
          onClick={onEdit}
        >
          {CAPTURE_EDIT}
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
