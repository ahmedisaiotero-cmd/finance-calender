"use client";

import { useEffect, useRef } from "react";

import type { MemoryDetailView } from "@/lib/mobile-prototype/build-memory-detail";
import {
  MEMORY_BACK,
  MEMORY_DETAILS_HEADING,
  MEMORY_EDIT_ACTION,
  MEMORY_EDIT_CANCEL,
  MEMORY_EDIT_HEADING,
  MEMORY_EDIT_SAVE,
  MEMORY_LABEL_AREA,
  MEMORY_LABEL_BRIEF,
  MEMORY_LABEL_NEXT,
  MEMORY_LABEL_PERSON,
  MEMORY_LABEL_REPEATS,
  MEMORY_LABEL_SURFACE,
  MEMORY_LABEL_TIME,
  MEMORY_LABEL_WEIGHT,
  MEMORY_LABEL_WHEN,
  MEMORY_RELATED_HEADING,
  MEMORY_REMOVE_ACTION,
  MEMORY_SAID_HEADING,
  MEMORY_UNDERSTOOD_HEADING,
  MEMORY_WHY_HEADING,
} from "@/lib/mobile-prototype/sync-voice";

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
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [detail.id]);

  return (
    <article
      ref={scrollRef}
      className="sync-screen-scroll sync-memory-detail-screen mobile-prototype-pad-x"
    >
      <header className="sync-memory-detail-header">
        <button type="button" onClick={onBack} className="sync-memory-detail-back">
          {MEMORY_BACK}
        </button>
        <h1 className="sync-memory-detail-title mobile-prototype-display">
          {detail.title}
        </h1>
      </header>

      <section className="sync-memory-detail-section sync-memory-detail-interpretation">
        <h2 className="sync-memory-detail-whisper">{MEMORY_WHY_HEADING}</h2>
        <p className="sync-memory-detail-copy">{detail.whyRemembered}</p>
      </section>

      {editing ? (
        <section className="sync-memory-detail-section sync-memory-detail-edit">
          <h2 className="sync-memory-detail-whisper">{MEMORY_EDIT_HEADING}</h2>
          <textarea
            className="sync-memory-detail-edit-input"
            value={editText}
            onChange={(event) => onEditTextChange?.(event.target.value)}
            rows={4}
            aria-label={MEMORY_EDIT_HEADING}
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
              {MEMORY_EDIT_SAVE}
            </button>
            <button
              type="button"
              className="sync-memory-detail-edit-cancel"
              onClick={onEditCancel}
            >
              {MEMORY_EDIT_CANCEL}
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="sync-memory-detail-original">
            <h2 className="sync-memory-detail-whisper">{MEMORY_SAID_HEADING}</h2>
            <blockquote className="sync-memory-detail-original-value">
              &ldquo;{detail.originalInput}&rdquo;
            </blockquote>
          </section>

          <section className="sync-memory-detail-section">
            <h2 className="sync-memory-detail-whisper">{MEMORY_UNDERSTOOD_HEADING}</h2>
            <p className="sync-memory-detail-copy">{detail.cleanedSummary}</p>
          </section>

          <section className="sync-memory-detail-section">
            <h2 className="sync-memory-detail-whisper">{MEMORY_DETAILS_HEADING}</h2>
            <dl className="sync-memory-detail-facts">
              <DetailRow label={MEMORY_LABEL_WEIGHT} value={detail.importance} />
              <DetailRow label={MEMORY_LABEL_AREA} value={detail.category} />
              {detail.relatedPerson && (
                <DetailRow label={MEMORY_LABEL_PERSON} value={detail.relatedPerson} />
              )}
              <DetailRow label={MEMORY_LABEL_WHEN} value={detail.resolvedDate} />
              {detail.recurrence && (
                <DetailRow label={MEMORY_LABEL_REPEATS} value={detail.recurrence} />
              )}
              {detail.nextOccurrence && (
                <DetailRow label={MEMORY_LABEL_NEXT} value={detail.nextOccurrence} />
              )}
              <DetailRow label={MEMORY_LABEL_BRIEF} value={detail.briefPresence} />
              <DetailRow label={MEMORY_LABEL_SURFACE} value={detail.surfaceEligibility} />
              <DetailRow label={MEMORY_LABEL_TIME} value={detail.timeImpact} />
            </dl>
          </section>
        </>
      )}

      {!editing && detail.relatedMemories.length > 0 && (
        <section className="sync-memory-detail-section">
          <h2 className="sync-memory-detail-whisper">{MEMORY_RELATED_HEADING}</h2>
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
              {MEMORY_EDIT_ACTION}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="sync-memory-detail-remove"
              onClick={onRemove}
            >
              {MEMORY_REMOVE_ACTION}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
