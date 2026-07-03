"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCapturedItems, type CapturedSyncItem } from "@/lib/captured-items";
import {
  buildSyncLabReviewGroups,
  SYNC_LAB_REVIEW_VISIBLE_LIMIT,
  type SyncLabMemoryVisibilityMap,
} from "@/lib/sync-engine/tools/lab-state";

import { readLabMemories, readLabMemoryVisibility } from "../lab-session";
import styles from "../page.module.css";

type ReviewAction = "confirmed" | "correcting" | "removed";

export default function SyncLabReviewPage() {
  const { activeItems } = useCapturedItems();
  const [testMemories, setTestMemories] = useState<CapturedSyncItem[]>([]);
  const [memoryVisibility, setMemoryVisibility] =
    useState<SyncLabMemoryVisibilityMap>({});
  const [actions, setActions] = useState<Record<string, ReviewAction>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    queueMicrotask(() => {
      setTestMemories(readLabMemories());
      setMemoryVisibility(readLabMemoryVisibility());
    });
  }, []);

  const groups = useMemo(
    () =>
      buildSyncLabReviewGroups({
        storedItems: activeItems,
        testItems: testMemories,
        visibility: memoryVisibility,
        limitPerGroup: 100,
      }),
    [activeItems, memoryVisibility, testMemories],
  );

  function mark(id: string, action: ReviewAction) {
    setActions((current) => ({ ...current, [id]: action }));
  }

  return (
    <main className={styles.page}>
      <div className={styles.managementShell}>
        <header className={styles.header}>
          <div>
            <p className={styles.brand}>SYNC</p>
            <p className={styles.subtitle}>What Sync thinks it knows.</p>
          </div>
          <nav className={styles.labNav} aria-label="Sync lab">
            <Link href="/sync-lab">Lab</Link>
            <Link href="/sync-lab/memory">Memory</Link>
            <Link href="/sync-lab/review">Review</Link>
          </nav>
        </header>

        <section className={styles.reviewIntro}>
          <h1>Review understanding</h1>
          <p>
            Corrections here are lab-only for now. They let us test the feedback
            loop without changing stored product memory.
          </p>
        </section>

        <section className={styles.reviewGroups}>
          {groups.map((group) => (
            <section className={styles.reviewGroup} key={group.name}>
              <h2>{group.name}</h2>
              {group.items.length > 0 ? (
                <ul>
                  {(expandedGroups[group.name]
                    ? group.items
                    : group.items.slice(0, SYNC_LAB_REVIEW_VISIBLE_LIMIT)
                  ).map((item) => (
                    <li
                      className={
                        actions[item.id] === "removed" ? styles.removedReview : ""
                      }
                      key={`${item.source}-${item.id}`}
                    >
                      <p>
                        <span>Sync thinks...</span>
                        {item.thinks}
                      </p>
                      <p>
                        <span>Evidence...</span>
                        {item.evidence.join(" ")}
                      </p>
                      <p>
                        <span>Confidence...</span>
                        {item.confidenceLabel}
                      </p>
                      <div className={styles.reviewActions}>
                        <button type="button" onClick={() => mark(item.id, "correcting")}>
                          Correct
                        </button>
                        <button type="button" onClick={() => mark(item.id, "confirmed")}>
                          Confirm
                        </button>
                        <button type="button" onClick={() => mark(item.id, "removed")}>
                          Remove
                        </button>
                        {actions[item.id] ? (
                          <em>{actions[item.id]} - lab-only</em>
                        ) : null}
                      </div>
                    </li>
                  ))}
                  {group.items.length > SYNC_LAB_REVIEW_VISIBLE_LIMIT ? (
                    <li className={styles.showMoreRow}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.name]: !current[group.name],
                          }))
                        }
                      >
                        {expandedGroups[group.name] ? "Show less" : "Show more"}
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className={styles.quiet}>Nothing in this group yet.</p>
              )}
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
