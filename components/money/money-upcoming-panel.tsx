"use client";

import { useMemo } from "react";

import { SectionEyebrow, TimelineItemRow } from "@/components/sync";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { getMoneyUpcomingFromTimeline } from "@/lib/health-from-timeline";
import { shortDateLabel } from "@/lib/sync-timeline";
import { formatTransactionTotal } from "@/lib/transaction-utils";

export function MoneyUpcomingPanel() {
  const now = new Date();
  const { timeline, ready } = useSyncTimeline(
    now.getFullYear(),
    now.getMonth(),
  );

  const upcoming = useMemo(
    () => getMoneyUpcomingFromTimeline(timeline, now),
    [timeline, now],
  );

  return (
    <section>
      <SectionEyebrow title="Upcoming" />

      {!ready ? (
        <p className="text-[12px] text-muted-foreground/55">Loading…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/55">
          No upcoming bills this month.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {upcoming.map((item) => (
            <TimelineItemRow
              key={item.id}
              id={item.id}
              variant="upcoming"
              dayLabel={shortDateLabel(item.date)}
              title={item.title}
              category="money"
              trailing={
                <span className="text-[13px] font-medium tabular-nums text-foreground/80">
                  {formatTransactionTotal(Math.abs(item.amount ?? 0))}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
