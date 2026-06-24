"use client";

import { useMemo } from "react";

import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { useCapturedItems } from "@/lib/captured-items";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildMyLifeOverview } from "@/lib/mobile-prototype/build-my-life";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import {
  MY_LIFE_BACK,
  MY_LIFE_EMPTY,
  MY_LIFE_LEDE,
  MY_LIFE_TITLE,
} from "@/lib/mobile-prototype/sync-voice";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type MyLifeScreenProps = {
  onBack: () => void;
  onOpenTarget: (target: LifeDrilldownTarget) => void;
};

export function MyLifeScreen({ onBack, onOpenTarget }: MyLifeScreenProps) {
  const { activeItems } = useCapturedItems();
  const reference = useMemo(() => new Date(), [activeItems.length]);

  const overview = useMemo(() => {
    const brief = buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      lifeProfile: loadLifeProfile(),
      reference,
    });

    return buildMyLifeOverview({
      items: activeItems,
      consequences: brief.consequences ?? [],
      reference,
    });
  }, [activeItems, reference]);

  return (
    <article className="sync-screen-scroll sync-my-life-screen mobile-prototype-pad-x">
      <header className="sync-drilldown-header">
        <button type="button" onClick={onBack} className="sync-drilldown-back">
          ← {MY_LIFE_BACK}
        </button>
        <h1 className="sync-drilldown-title mobile-prototype-display">
          {MY_LIFE_TITLE}
        </h1>
        <p className="sync-my-life-lede">{MY_LIFE_LEDE}</p>
      </header>

      <section className="sync-my-life-body">
        {overview.isEmpty ? (
          <p className="sync-my-life-empty">{MY_LIFE_EMPTY}</p>
        ) : (
          <ul className="sync-my-life-list">
            {overview.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="sync-my-life-row"
                  onClick={() => onOpenTarget(row.target)}
                >
                  <span className="sync-my-life-row-label">{row.label}</span>
                  <span className="sync-my-life-row-summary">{row.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
