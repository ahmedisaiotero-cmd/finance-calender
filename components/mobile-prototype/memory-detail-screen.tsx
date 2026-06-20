"use client";

import type { MemoryDetailView } from "@/lib/mobile-prototype/build-memory-detail";

type MemoryDetailScreenProps = {
  detail: MemoryDetailView;
  onBack: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sync-memory-detail-row">
      <dt className="sync-memory-detail-label">{label}</dt>
      <dd className="sync-memory-detail-value">{value}</dd>
    </div>
  );
}

export function MemoryDetailScreen({ detail, onBack }: MemoryDetailScreenProps) {
  return (
    <article className="sync-screen-scroll sync-memory-detail-screen mobile-prototype-pad-x">
      <header className="sync-memory-detail-header">
        <button type="button" onClick={onBack} className="sync-memory-detail-back">
          Memory
        </button>
        <h1 className="sync-memory-detail-title mobile-prototype-display">
          {detail.title}
        </h1>
      </header>

      <section className="sync-memory-detail-section">
        <h2 className="sync-memory-detail-whisper">Why Sync remembers this</h2>
        <p className="sync-memory-detail-copy">{detail.whyRemembered}</p>
      </section>

      <dl className="sync-memory-detail-facts">
        <DetailRow label="Original input" value={detail.originalInput} />
        <DetailRow label="Category" value={detail.category} />
        <DetailRow label="Resolved date" value={detail.resolvedDate} />
        {detail.recurrence && (
          <DetailRow label="Recurrence" value={detail.recurrence} />
        )}
        {detail.nextOccurrence && (
          <DetailRow label="Next occurrence" value={detail.nextOccurrence} />
        )}
        <DetailRow
          label="Mentioned in brief"
          value={detail.mentionedInBrief ? "Yes" : "No"}
        />
        <DetailRow
          label="Brief eligible"
          value={detail.briefEligible ? "Yes" : "No"}
        />
        <DetailRow
          label="Calendar impact"
          value={detail.calendarImpact ? "Yes" : "No"}
        />
      </dl>

      {detail.relatedMemories.length > 0 && (
        <section className="sync-memory-detail-section">
          <h2 className="sync-memory-detail-whisper">Related memories</h2>
          <ul className="sync-memory-detail-related">
            {detail.relatedMemories.map((memory) => (
              <li key={memory}>{memory}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
