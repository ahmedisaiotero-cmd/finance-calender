"use client";

import { useMemo, useState } from "react";

import { MemoryDetailScreen } from "@/components/mobile-prototype/memory-detail-screen";
import { useCapturedItems } from "@/lib/captured-items";
import { buildMemoryDetail } from "@/lib/mobile-prototype/build-memory-detail";
import { buildMemoryEntries } from "@/lib/mobile-prototype/format-memory-entry";
import {
  availableMemoryFilters,
  memoryFilterCategory,
  type MemoryFilterCategory,
} from "@/lib/mobile-prototype/memory-category";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

export function MemoryScreen() {
  const { activeItems, softDeleteCapturedItem } = useCapturedItems();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MemoryFilterCategory>("All");

  const entries = useMemo(() => buildMemoryEntries(activeItems), [activeItems]);

  const filters = useMemo(
    () => availableMemoryFilters(activeItems),
    [activeItems],
  );

  const filteredEntries = useMemo(() => {
    if (activeFilter === "All") return entries;
    const categoryById = new Map(
      activeItems.map((item) => [item.id, memoryFilterCategory(item)]),
    );
    return entries.filter(
      (entry) => categoryById.get(entry.id) === activeFilter,
    );
  }, [entries, activeFilter, activeItems]);

  const selectedItem = useMemo(
    () => activeItems.find((item) => item.id === selectedId) ?? null,
    [activeItems, selectedId],
  );

  const detail = useMemo(() => {
    if (!selectedItem) return null;
    return buildMemoryDetail(selectedItem, activeItems, {
      workSchedule: loadActiveWorkSchedule() ?? null,
    });
  }, [selectedItem, activeItems]);

  if (detail) {
    return (
      <MemoryDetailScreen
        detail={detail}
        onBack={() => setSelectedId(null)}
        onRemove={() => {
          softDeleteCapturedItem(detail.id);
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <article className="sync-screen-scroll mobile-prototype-pad-x">
      <header className="sync-screen-header">
        <h1 className="sync-screen-title mobile-prototype-display">Memory</h1>
        <p className="sync-screen-subtitle">
          What I&apos;m holding for you.
        </p>
      </header>

      {filters.length > 1 && (
        <div
          className="sync-memory-filters"
          role="tablist"
          aria-label="Filter memories"
        >
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter}
              className="sync-memory-filter"
              data-active={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="sync-memory-empty">
          Nothing here yet. Tell Sync something on Today and I&apos;ll remember it.
        </p>
      ) : filteredEntries.length === 0 ? (
        <p className="sync-memory-empty">
          No memories in this category yet.
        </p>
      ) : (
        <ul className="sync-memory-list">
          {filteredEntries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="sync-memory-item"
                onClick={() => setSelectedId(entry.id)}
              >
                <div className="sync-memory-item-head">
                  <h2 className="sync-memory-title">{entry.title}</h2>
                  <span className="sync-memory-remembered">{entry.rememberedAt}</span>
                </div>
                {entry.timing && (
                  <p className="sync-memory-timing">{entry.timing}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
