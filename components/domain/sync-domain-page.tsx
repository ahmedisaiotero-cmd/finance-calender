"use client";

import Link from "next/link";

import type { CapturedSyncItem } from "@/lib/captured-items";

type SyncDomainPageProps = {
  title: string;
  supportingCopy: string;
  items: CapturedSyncItem[];
  insights: string[];
};

const UPCOMING_LABELS = new Set([
  "Today",
  "Tomorrow",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Next week",
]);

function itemMeta(item: CapturedSyncItem) {
  return [item.dateLabel, item.timeLabel]
    .filter((value) => value && value !== "Flexible" && value !== "Upcoming")
    .join(" • ");
}

function isUpcoming(item: CapturedSyncItem) {
  return UPCOMING_LABELS.has(item.dateLabel) || item.timeLabel !== "Flexible";
}

export function SyncDomainPage({
  title,
  supportingCopy,
  items,
  insights,
}: SyncDomainPageProps) {
  const recent = items.slice(0, 5);
  const upcoming = items.filter(isUpcoming).slice(0, 7);

  return (
    <div className="sync-domain-page">
      <header className="sync-domain-header">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary/60" aria-hidden />
          <p className="text-[12px] font-medium text-muted-foreground/62">
            In Sync
          </p>
        </div>
        <h1 className="mt-3 text-[2rem] font-medium tracking-[-0.045em] text-foreground/95">
          {title}
        </h1>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-muted-foreground/70">
          {supportingCopy}
        </p>
      </header>

      <section className="sync-domain-section">
        <h2 className="sync-domain-section-title">Recent</h2>
        {recent.length === 0 ? (
          <p className="sync-domain-empty">Nothing captured yet.</p>
        ) : (
          <ul className="sync-domain-list">
            {recent.map((item) => (
              <DomainItem key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section className="sync-domain-section">
        <h2 className="sync-domain-section-title">Upcoming</h2>
        <p className="mt-1 text-[12px] text-muted-foreground/50">Next 7 days</p>
        {upcoming.length === 0 ? (
          <p className="sync-domain-empty">Nothing upcoming.</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-7">
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/25 bg-background/25 px-3 py-3 sm:min-h-24"
              >
                <p className="text-[11px] text-muted-foreground/58">
                  {item.dateLabel}
                </p>
                <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-snug text-foreground/86">
                  {item.title}
                </p>
                {item.timeLabel !== "Flexible" && (
                  <p className="mt-1 text-[11px] text-muted-foreground/58">
                    {item.timeLabel}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sync-domain-section">
        <h2 className="sync-domain-section-title">Insights</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {insights.map((insight) => (
            <li
              key={insight}
              className="text-[14px] leading-relaxed text-muted-foreground/74"
            >
              {insight}
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap gap-3">
        <Link href="/" className="sync-domain-action">
          + Add something
        </Link>
        <Link href="/calendar" className="sync-domain-action sync-domain-action--quiet">
          View Calendar →
        </Link>
      </footer>
    </div>
  );
}

function DomainItem({ item }: { item: CapturedSyncItem }) {
  const meta = itemMeta(item);

  return (
    <li className="sync-domain-item">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
          {item.title}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground/62">
          {meta || item.category}
        </p>
      </div>
      {item.amount && (
        <span
          data-money-type={item.moneyType}
          className="shrink-0 text-[13px] font-medium text-muted-foreground/70 data-[money-type=income]:text-income/80"
        >
          {item.amount}
        </span>
      )}
    </li>
  );
}
