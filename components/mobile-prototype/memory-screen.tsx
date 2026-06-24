"use client";

import { useMemo, useState } from "react";

import { MemoryDetailScreen } from "@/components/mobile-prototype/memory-detail-screen";
import { useCapturedItems } from "@/lib/captured-items";
import { buildMemoryReflection } from "@/lib/mobile-prototype/build-memory-reflection";
import { buildMemoryEntries } from "@/lib/mobile-prototype/format-memory-entry";
import { applyMemoryEdit } from "@/lib/sync-capture/apply-memory-edit";
import {
  MEMORY_EMPTY,
  MEMORY_SUBTITLE,
  MEMORY_TITLE,
} from "@/lib/mobile-prototype/sync-voice";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

export function MemoryScreen() {
  const { activeItems, softDeleteCapturedItem, updateCapturedItem } =
    useCapturedItems();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editNotice, setEditNotice] = useState<string | null>(null);

  const entries = useMemo(() => buildMemoryEntries(activeItems), [activeItems]);

  const selectedItem = useMemo(
    () => activeItems.find((item) => item.id === selectedId) ?? null,
    [activeItems, selectedId],
  );

  const detail = useMemo(() => {
    if (!selectedItem) return null;
    return buildMemoryReflection(selectedItem, activeItems);
  }, [selectedItem, activeItems]);

  const handleEditSave = () => {
    if (!selectedId || !editText.trim()) return;

    const result = applyMemoryEdit(
      selectedId,
      editText,
      {
        items: activeItems,
        workSchedule: loadActiveWorkSchedule() ?? null,
      },
      { updateCapturedItem },
    );

    if (result.status === "saved") {
      setEditing(false);
      setEditNotice(null);
      return;
    }

    if (result.status === "needs_clarification" || result.status === "too_vague") {
      setEditNotice(result.message);
      return;
    }
  };

  if (detail) {
    return (
      <MemoryDetailScreen
        key={detail.id}
        detail={detail}
        onBack={() => {
          setSelectedId(null);
          setEditing(false);
          setEditNotice(null);
        }}
        onRemove={() => {
          softDeleteCapturedItem(detail.id);
          setSelectedId(null);
          setEditing(false);
        }}
        editing={editing}
        editText={editText}
        editNotice={editNotice}
        onEdit={() => {
          setEditText(detail.originalInput);
          setEditNotice(null);
          setEditing(true);
        }}
        onEditTextChange={(value) => {
          setEditText(value);
          if (editNotice) setEditNotice(null);
        }}
        onEditSave={handleEditSave}
        onEditCancel={() => {
          setEditing(false);
          setEditNotice(null);
        }}
      />
    );
  }

  return (
    <article className="sync-screen-scroll mobile-prototype-pad-x">
      <header className="sync-screen-header">
        <h1 className="sync-screen-title mobile-prototype-display">{MEMORY_TITLE}</h1>
        <p className="sync-screen-subtitle">{MEMORY_SUBTITLE}</p>
      </header>

      {entries.length === 0 ? (
        <p className="sync-memory-empty">{MEMORY_EMPTY}</p>
      ) : (
        <ul className="sync-memory-list">
          {entries.map((entry, index) => (
            <li key={entry.id || `${entry.prompt}-${entry.rememberedAt}-${index}`}>
              <button
                type="button"
                className="sync-memory-item"
                onClick={() => setSelectedId(entry.id)}
              >
                <div className="sync-memory-item-head">
                  <h2 className="sync-memory-title">{entry.title}</h2>
                  <span className="sync-memory-remembered">{entry.rememberedAt}</span>
                </div>
                {entry.subtitle && (
                  <p className="sync-memory-timing">{entry.subtitle}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
