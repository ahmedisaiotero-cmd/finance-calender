"use client";

import Link from "next/link";

import type { DashboardTodayRow } from "@/components/dashboard/dashboard-fallback";
import {
  EmptyState,
  SectionPanel,
  TimelineItemRow,
} from "@/components/sync";

type TodayHeaderProps = {
  dateLabel: string;
  items: DashboardTodayRow[];
  loading?: boolean;
};

export function TodayHeader({ dateLabel, items, loading }: TodayHeaderProps) {
  return (
    <SectionPanel
      title="Today"
      subtitle={dateLabel}
      action={
        <Link
          href="/calendar"
          className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
        >
          Calendar
        </Link>
      }
    >
      {loading ? (
        <EmptyState message="Loading your timeline…" />
      ) : items.length === 0 ? (
        <EmptyState
          message="Nothing scheduled yet."
          action={
            <Link
              href="/calendar"
              className="text-foreground/75 transition-colors hover:text-foreground"
            >
              Open Calendar
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col">
          {items.map((item, index) => (
            <TimelineItemRow
              key={item.id}
              id={item.id}
              timeLabel={item.time}
              title={item.title}
              meta={item.meta}
              category={item.category}
              showDivider={index > 0}
            />
          ))}
        </ul>
      )}
    </SectionPanel>
  );
}
