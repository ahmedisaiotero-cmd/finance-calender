"use client";

import type { LifeDrilldownView } from "@/lib/mobile-prototype/build-life-drilldown";

type LifeDrilldownScreenProps = {
  view: LifeDrilldownView;
  onBack: () => void;
};

export function LifeDrilldownScreen({ view, onBack }: LifeDrilldownScreenProps) {
  return (
    <article className="sync-screen-scroll sync-drilldown-screen mobile-prototype-pad-x">
      <header className="sync-drilldown-header">
        <button type="button" onClick={onBack} className="sync-drilldown-back">
          ← {view.backLabel}
        </button>
        <h1 className="sync-drilldown-title mobile-prototype-display">{view.title}</h1>
      </header>

      <section className="sync-drilldown-body">
        <p className="sync-drilldown-lede">{view.lede}</p>

        {view.timeline.length > 0 && (
          <ul className="sync-drilldown-timeline">
            {view.timeline.map((entry) => (
              <li key={entry.id ?? entry.text} className="sync-drilldown-entry">
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
        )}

        {view.contextLines.map((line) => (
          <p key={line} className="sync-drilldown-context">
            {line}
          </p>
        ))}
      </section>
    </article>
  );
}
