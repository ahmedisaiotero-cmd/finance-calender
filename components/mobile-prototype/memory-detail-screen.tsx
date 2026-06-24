"use client";

import { useEffect, useRef } from "react";

import type { MemoryReflectionView } from "@/lib/mobile-prototype/build-memory-reflection";
import {
  MEMORY_BACK,
  MEMORY_CONNECTED_HEADING,
  MEMORY_EDIT_ACTION,
  MEMORY_EDIT_CANCEL,
  MEMORY_EDIT_HEADING,
  MEMORY_EDIT_SAVE,
  MEMORY_REMOVE_ACTION,
} from "@/lib/mobile-prototype/sync-voice";

type MemoryDetailScreenProps = {
  detail: MemoryReflectionView;
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
        <section className="sync-memory-detail-section sync-memory-detail-reflective">
          <p className="sync-memory-detail-worth">{detail.worthLine}</p>
          {detail.whenLine && (
            <p className="sync-memory-detail-when">{detail.whenLine}</p>
          )}
          <p className="sync-memory-detail-context">{detail.contextLine}</p>
          {detail.patternLine && (
            <p className="sync-memory-detail-pattern">{detail.patternLine}</p>
          )}
          <p className="sync-memory-detail-understood">{detail.understoodLine}</p>
          <blockquote className="sync-memory-detail-original-value sync-memory-detail-quote">
            &ldquo;{detail.originalInput}&rdquo;
          </blockquote>
        </section>
      )}

      {!editing && detail.connectedMemories.length > 0 && (
        <section className="sync-memory-detail-section">
          <h2 className="sync-memory-detail-whisper">{MEMORY_CONNECTED_HEADING}</h2>
          <ul className="sync-memory-detail-related">
            {detail.connectedMemories.map((memory) => (
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
