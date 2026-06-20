"use client";

import type { MemoryDetailView } from "@/lib/mobile-prototype/build-memory-detail";

type MemoryDetailScreenProps = {
  detail: MemoryDetailView;
  onBack: () => void;
  onRemove?: () => void;
  editing?: boolean;
  editText?: string;
  editNotice?: string | null;
  onEdit?: () => void;
  onEditTextChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sync-memory-detail-row">
      <dt className="sync-memory-detail-label">{label}</dt>
      <dd className="sync-memory-detail-value">{value}</dd>
    </div>
  );
}

export function MemoryDetailScreen({
  detail,
  onBack,
  onRemove,
  editing = false,
  editText = "",
  editNotice = null,
  onEdit,
  onEditTextChange,
  onEditSave,
  onEditCancel,
}: MemoryDetailScreenProps) {
  return (
    <article className="sync-screen-scroll sync-memory-detail-screen mobile-prototype-pad-x">
      <header className="sync-memory-detail-header">
        <button type="button" onClick={onBack} className="sync-memory-detail-back">
          ← Memory
        </button>
        <h1 className="sync-memory-detail-title mobile-prototype-display">
          {detail.title}
        </h1>
      </header>

      <section className="sync-memory-detail-section sync-memory-detail-interpretation">
        <h2 className="sync-memory-detail-whisper">Why Sync remembers this</h2>
        <p className="sync-memory-detail-copy">{detail.whyRemembered}</p>
      </section>

      {editing ? (
        <section className="sync-memory-detail-section sync-memory-detail-edit">
          <h2 className="sync-memory-detail-whisper">Edit memory</h2>
          <textarea
            className="sync-memory-detail-edit-input"
            value={editText}
            onChange={(event) => onEditTextChange?.(event.target.value)}
            rows={4}
            aria-label="Edit memory"
          />
          {editNotice && (
            <p className="sync-memory-detail-edit-notice" role="status">
              {editNotice}
            </p>
          )}
          <div className="sync-memory-detail-edit-actions">
            <button
              type="button"
              className="sync-memory-detail-edit-save"
              disabled={!editText.trim()}
              onClick={onEditSave}
            >
              Save
            </button>
            <button
              type="button"
              className="sync-memory-detail-edit-cancel"
              onClick={onEditCancel}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="sync-memory-detail-original">
            <h2 className="sync-memory-detail-whisper">Original input</h2>
            <blockquote className="sync-memory-detail-original-value">
              &ldquo;{detail.originalInput}&rdquo;
            </blockquote>
          </section>

          <dl className="sync-memory-detail-facts">
            <DetailRow label="Category" value={detail.category} />
            <DetailRow label="Resolved date" value={detail.resolvedDate} />
            {detail.recurrence && (
              <DetailRow label="Recurrence" value={detail.recurrence} />
            )}
            {detail.nextOccurrence && (
              <DetailRow label="Next occurrence" value={detail.nextOccurrence} />
            )}
            <DetailRow
              label="Mentioned in brief"
              value={detail.mentionedInBrief ? "Yes" : "No"}
            />
            <DetailRow
              label="Brief eligible"
              value={detail.briefEligible ? "Yes" : "No"}
            />
            <DetailRow
              label="Calendar impact"
              value={detail.calendarImpact ? "Yes" : "No"}
            />
          </dl>
        </>
      )}

      {!editing && detail.relatedMemories.length > 0 && (
        <section className="sync-memory-detail-section">
          <h2 className="sync-memory-detail-whisper">Related memories</h2>
          <ul className="sync-memory-detail-related">
            {detail.relatedMemories.map((memory) => (
              <li key={memory.id}>{memory.title}</li>
            ))}
          </ul>
        </section>
      )}

      {!editing && (onEdit || onRemove) && (
        <footer className="sync-memory-detail-actions">
          {onEdit && (
            <button
              type="button"
              className="sync-memory-detail-edit"
              onClick={onEdit}
            >
              Edit memory
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="sync-memory-detail-remove"
              onClick={onRemove}
            >
              Remove from memory
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
