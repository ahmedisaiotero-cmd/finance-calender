"use client";

import Link from "next/link";

import type { DashboardUpcomingRow } from "@/components/dashboard/dashboard-fallback";
import { takeUpcomingPreview, UPCOMING_PREVIEW_DAYS } from "@/components/dashboard/dashboard-timeline-mappers";
import { EmptyState, SectionEyebrow, TimelineItemRow } from "@/components/sync";

type UpcomingHeroProps = {
  items: DashboardUpcomingRow[];
};

export function UpcomingHero({ items }: UpcomingHeroProps) {
  const preview = takeUpcomingPreview(items);

  return (
    <section>
      <SectionEyebrow
        title="Upcoming"
        meta={`Next ${UPCOMING_PREVIEW_DAYS} days on your timeline`}
        action={
          <Link
            href="/calendar"
            className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
          >
            View all
          </Link>
        }
      />

      {preview.length === 0 ? (
        <EmptyState message="Nothing coming up soon." />
      ) : (
        <ul className="flex flex-col gap-3.5">
          {preview.map((item) => (
            <TimelineItemRow
              key={item.id}
              id={item.id}
              variant="upcoming"
              dayLabel={item.dayLabel}
              dateLabel={item.dateLabel}
              title={item.title}
              meta={item.meta}
              category={item.category}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
