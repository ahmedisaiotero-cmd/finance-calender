"use client";

import type { HomeFocusItem } from "@/lib/home-focus";
import type { DomainConnection } from "@/lib/sync-connections";
import { CONNECTION_EMPTY_COPY } from "@/lib/sync-connections";
import {
  ConnectionEmptyState,
  EmptyState,
} from "@/components/sync";

type HomeTodayCardProps = {
  dateLabel: string;
  priorities: HomeFocusItem[];
  calendar: DomainConnection;
  loading?: boolean;
};

export function HomeTodayCard({
  dateLabel,
  priorities,
  calendar,
  loading,
}: HomeTodayCardProps) {
  const calendarActive = calendar.status === "connected";
  const emptyCopy = CONNECTION_EMPTY_COPY.calendar;

  return (
    <section className="sync-home-surface sync-home-today">
      <header>
        <h2 className="text-[1.125rem] font-medium tracking-[-0.03em] text-foreground/95">
          Today
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground/75">{dateLabel}</p>
      </header>

      {loading ? (
        <div className="mt-6">
          <EmptyState message="Loading your timeline…" />
        </div>
      ) : !calendarActive ? (
        <div className="mt-6">
          <ConnectionEmptyState
            message={emptyCopy.message}
            actionLabel={emptyCopy.actionLabel}
            href={emptyCopy.href}
          />
        </div>
      ) : priorities.length === 0 ? (
        <p className="mt-6 text-[13px] text-muted-foreground/72">
          Your slate is clear.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {priorities.slice(0, 3).map((item) => (
            <li key={item.id}>
              <p className="text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                {item.title}
              </p>
              {item.segment && (
                <p className="mt-0.5 text-[12px] text-muted-foreground/72">
                  {item.segment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
