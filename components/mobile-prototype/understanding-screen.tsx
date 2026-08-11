"use client";

import { useMemo } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildUnderstandingView } from "@/lib/mobile-prototype/build-understanding-view";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type UnderstandingScreenProps = {
  onOpenTarget?: (target: LifeDrilldownTarget) => void;
};

function confidenceLabel(level: "low" | "medium" | "high") {
  if (level === "high") return "Clear";
  if (level === "medium") return "Forming";
  return "Early";
}

export function UnderstandingScreen({ onOpenTarget }: UnderstandingScreenProps) {
  const { activeItems } = useCapturedItems();
  const reference = useMemo(() => new Date(), [activeItems.length]);

  const view = useMemo(() => {
    const brief = buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      lifeProfile: loadLifeProfile(),
      reference,
    });

    return buildUnderstandingView({
      items: activeItems,
      consequences: brief.consequences ?? [],
      reference,
    });
  }, [activeItems, reference]);

  return (
    <article className="sync-ws-screen sync-ws-screen--understanding">
      <header className="sync-ws-header">
        <h1 className="sync-ws-title">Understanding</h1>
        <p className="sync-ws-subtitle">{view.lede}</p>
      </header>

      {view.isEmpty ? (
        <p className="sync-ws-empty">
          Tell Sync a few life updates and this will become clearer.
        </p>
      ) : (
        <ul className="sync-ws-understanding-list">
          {view.rows.map((row) => {
            const target = row.target;

            return (
            <li key={row.id}>
              {target ? (
                <button
                  type="button"
                  className="sync-ws-understanding-row"
                  onClick={() => onOpenTarget?.(target)}
                >
                  <span className="sync-ws-understanding-label">{row.label}</span>
                  <span className="sync-ws-understanding-summary">
                    Sync believes {row.summary.charAt(0).toLowerCase()}
                    {row.summary.slice(1)}.
                  </span>
                  <span className="sync-ws-understanding-meta">
                    Confidence: {confidenceLabel(row.confidence)}
                  </span>
                  {row.evidencePoints.map((point, index) => (
                    <span key={`${row.id}-evidence-${index}`} className="sync-ws-understanding-meta">
                      Evidence: {point}
                    </span>
                  ))}
                  <span className="sync-ws-understanding-meta">Last updated: {row.lastUpdated}</span>
                </button>
              ) : (
                <div className="sync-ws-understanding-row">
                  <span className="sync-ws-understanding-label">{row.label}</span>
                  <span className="sync-ws-understanding-summary">
                    Sync believes {row.summary.charAt(0).toLowerCase()}
                    {row.summary.slice(1)}.
                  </span>
                  <span className="sync-ws-understanding-meta">
                    Confidence: {confidenceLabel(row.confidence)}
                  </span>
                  {row.evidencePoints.map((point, index) => (
                    <span key={`${row.id}-evidence-${index}`} className="sync-ws-understanding-meta">
                      Evidence: {point}
                    </span>
                  ))}
                  <span className="sync-ws-understanding-meta">Last updated: {row.lastUpdated}</span>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
