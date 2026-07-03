"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCapturedItems, type CapturedSyncItem } from "@/lib/captured-items";
import type { MeaningImportance } from "@/lib/intelligence/meaning-engine";
import type { PulsePlanCategory } from "@/lib/pulse/types";
import {
  buildSyncLabMemoryRows,
  filterSyncLabMemoryRows,
  filterSyncLabMemoryRowsByVisibility,
  type SyncLabMemoryVisibilityFilter,
  type SyncLabMemoryVisibilityMap,
  type SyncLabMemoryRow,
} from "@/lib/sync-engine/tools/lab-state";

import {
  readLabMemories,
  readLabMemoryVisibility,
  writeLabMemories,
  writeLabMemoryVisibility,
} from "../lab-session";
import styles from "../page.module.css";

const CATEGORY_OPTIONS: PulsePlanCategory[] = [
  "workout",
  "workday",
  "work-schedule",
  "date-night",
  "subscription",
  "expense",
  "reminder",
  "savings-goal",
  "task",
  "general",
];

const IMPORTANCE_OPTIONS: MeaningImportance[] = [
  "low",
  "medium",
  "high",
  "critical",
];

function rowKey(row: SyncLabMemoryRow) {
  return `${row.source}:${row.id}`;
}

export default function SyncLabMemoryPage() {
  const { activeItems } = useCapturedItems();
  const [testMemories, setTestMemoriesState] = useState<CapturedSyncItem[]>([]);
  const [memoryVisibility, setMemoryVisibilityState] =
    useState<SyncLabMemoryVisibilityMap>({});
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<SyncLabMemoryVisibilityFilter>("visible");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setTestMemoriesState(readLabMemories());
      setMemoryVisibilityState(readLabMemoryVisibility());
    });
  }, []);

  function setTestMemories(memories: CapturedSyncItem[]) {
    setTestMemoriesState(memories);
    writeLabMemories(memories);
  }

  function setMemoryVisibility(visibility: SyncLabMemoryVisibilityMap) {
    setMemoryVisibilityState(visibility);
    writeLabMemoryVisibility(visibility);
  }

  const rows = useMemo(
    () =>
      filterSyncLabMemoryRows(
        filterSyncLabMemoryRowsByVisibility(
          buildSyncLabMemoryRows({
            storedItems: activeItems,
            testItems: testMemories,
            visibility: memoryVisibility,
          }),
          visibilityFilter,
        ),
        query,
      ),
    [activeItems, memoryVisibility, query, testMemories, visibilityFilter],
  );

  const selectedRow = rows.find((row) => rowKey(row) === selectedKey) ?? null;
  const selectedMemory =
    selectedRow?.source === "test"
      ? testMemories.find((item) => item.id === selectedRow.id) ?? null
      : activeItems.find((item) => item.id === selectedRow?.id) ?? null;
  const canEdit = selectedRow?.source === "test";

  function updateSelectedMemory(updates: Partial<CapturedSyncItem>) {
    if (!selectedMemory || !canEdit) return;
    setTestMemories(
      testMemories.map((item) =>
        item.id === selectedMemory.id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  function updateImportance(importance: MeaningImportance) {
    if (!selectedMemory || !canEdit) return;
    updateSelectedMemory({
      meaning: selectedMemory.meaning
        ? { ...selectedMemory.meaning, importance }
        : undefined,
    });
  }

  function deleteSelectedMemory() {
    if (!selectedMemory || !canEdit) return;
    setTestMemories(testMemories.filter((item) => item.id !== selectedMemory.id));
    const nextVisibility = { ...memoryVisibility };
    delete nextVisibility[selectedMemory.id];
    setMemoryVisibility(nextVisibility);
    setSelectedKey(null);
  }

  return (
    <main className={styles.page}>
      <div className={styles.managementShell}>
        <header className={styles.header}>
          <div>
            <p className={styles.brand}>SYNC</p>
            <p className={styles.subtitle}>Memory lab.</p>
          </div>
          <nav className={styles.labNav} aria-label="Sync lab">
            <Link href="/sync-lab">Lab</Link>
            <Link href="/sync-lab/memory">Memory</Link>
            <Link href="/sync-lab/review">Review</Link>
          </nav>
        </header>

        <section className={styles.managementGrid}>
          <div className={styles.memoryListPane}>
            <div className={styles.managementToolbar}>
              <h1>Memories</h1>
              <div className={styles.memoryFilters}>
                {(["visible", "internal", "all"] as const).map((filter) => (
                  <button
                    className={
                      visibilityFilter === filter ? styles.activeFilter : ""
                    }
                    type="button"
                    key={filter}
                    onClick={() => setVisibilityFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search..."
                />
              </div>
            </div>

            {rows.length > 0 ? (
              <ul className={styles.memoryRows}>
                {rows.map((row) => (
                  <li key={rowKey(row)}>
                    <button
                      type="button"
                      className={rowKey(row) === selectedKey ? styles.selectedRow : ""}
                      onClick={() => setSelectedKey(rowKey(row))}
                    >
                      <span>
                        <strong>{row.title}</strong>
                      </span>
                      <span>{row.category}</span>
                      <span>{row.importance}</span>
                      <span>{row.visibility}</span>
                      <span>{row.updatedDate}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>No memories match this lab view.</p>
            )}
          </div>

          <aside className={styles.editPane}>
            {selectedMemory && selectedRow ? (
              <>
                <div className={styles.editHeader}>
                  <h2>{canEdit ? "Edit test memory" : "Stored memory"}</h2>
                  <span>{canEdit ? "lab-only" : "read-only stored"}</span>
                </div>

                <label>
                  Title
                  <input
                    value={selectedMemory.title}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateSelectedMemory({ title: event.target.value })
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    value={selectedMemory.category}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateSelectedMemory({
                        category: event.target.value as PulsePlanCategory,
                      })
                    }
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Importance
                  <select
                    value={selectedMemory.meaning?.importance ?? "medium"}
                    disabled={!canEdit || !selectedMemory.meaning}
                    onChange={(event) =>
                      updateImportance(event.target.value as MeaningImportance)
                    }
                  >
                    {IMPORTANCE_OPTIONS.map((importance) => (
                      <option value={importance} key={importance}>
                        {importance}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes / raw text
                  <textarea
                    value={selectedMemory.notes ?? selectedMemory.originalPrompt ?? selectedMemory.prompt}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateSelectedMemory({ notes: event.target.value })
                    }
                  />
                </label>

                <div className={styles.memoryDetails}>
                  <p>
                    <span>Raw input</span>
                    {selectedRow.rawInput}
                  </p>
                  <p>
                    <span>Confidence</span>
                    {Math.round(selectedRow.confidence * 100)}%
                  </p>
                  <p>
                    <span>Created</span>
                    {selectedRow.createdDate}
                  </p>
                  <p>
                    <span>Related memories</span>
                    {selectedRow.relatedMemoryIds.length
                      ? selectedRow.relatedMemoryIds.join(", ")
                      : "none"}
                  </p>
                </div>

                {canEdit ? (
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={deleteSelectedMemory}
                  >
                    Delete test memory
                  </button>
                ) : (
                  <p className={styles.quiet}>
                    Stored memories are visible for context only. This lab does
                    not edit product memory.
                  </p>
                )}
              </>
            ) : (
              <p className={styles.quiet}>Select a memory to inspect it.</p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
