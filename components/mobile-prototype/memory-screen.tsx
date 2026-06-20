"use client";

import { useMemo, useState } from "react";

import { MemoryDetailScreen } from "@/components/mobile-prototype/memory-detail-screen";
import { SyncScreenBrand } from "@/components/mobile-prototype/sync-ui";
import { useCapturedItems } from "@/lib/captured-items";
import { buildMemoryDetail } from "@/lib/mobile-prototype/build-memory-detail";
import { buildMemoryEntries } from "@/lib/mobile-prototype/format-memory-entry";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

export function MemoryScreen() {
  const { activeItems } = useCapturedItems();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entries = useMemo(() => buildMemoryEntries(activeItems), [activeItems]);

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
      <MemoryDetailScreen detail={detail} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <article className="sync-screen-scroll mobile-prototype-pad-x">
      <SyncScreenBrand />
      <header className="sync-screen-header">
        <h1 className="sync-screen-title mobile-prototype-display">Memory</h1>
        <p className="sync-screen-subtitle">
          What I&apos;m holding for you.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="sync-memory-empty">
          Nothing here yet. Tell Sync something on Today and I&apos;ll remember it.
        </p>
      ) : (
        <ul className="sync-memory-list">
          {entries.map((entry) => (
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
