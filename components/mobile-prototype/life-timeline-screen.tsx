"use client";

import type { LifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";

type LifeTimelineScreenProps = {
  view: LifeTimelineView;
  backLabel: string;
  onBack: () => void;
};

export function LifeTimelineScreen({
  view,
  backLabel,
  onBack,
}: LifeTimelineScreenProps) {
  return (
    <article className="sync-screen-scroll sync-drilldown-screen mobile-prototype-pad-x">
      <header className="sync-drilldown-header">
        <button type="button" onClick={onBack} className="sync-drilldown-back">
          ← {backLabel}
        </button>
        <h1 className="sync-drilldown-title mobile-prototype-display">
          {view.title}
        </h1>
      </header>

      <section className="sync-drilldown-body">
        {view.groups.length === 0 ? (
          <p className="sync-drilldown-lede">Nothing scheduled ahead yet.</p>
        ) : (
          view.groups.map((group) => (
            <div key={group.id} className="sync-life-timeline-group">
              <h2 className="sync-life-timeline-group-label">{group.label}</h2>
              <ul className="sync-drilldown-timeline">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="sync-drilldown-entry">
                    {entry.time ? (
                      <>
                        <span className="sync-drilldown-time">{entry.time}</span>
                        <span className="sync-drilldown-sep"> — </span>
                        <span className="sync-drilldown-text">{entry.text}</span>
                      </>
                    ) : (
                      <span className="sync-drilldown-text">{entry.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </article>
  );
}
