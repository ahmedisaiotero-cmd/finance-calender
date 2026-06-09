"use client";

import Link from "next/link";

import { SurfaceCard } from "@/components/ui/surface-card";
import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<TimelineEvent["lifeCategory"], string> = {
  money: "Money",
  health: "Health",
  family: "Family",
  goals: "Goals",
  reflection: "Reflection",
  work: "Work",
  career: "Career",
  relationships: "Relationships",
  personal: "Personal",
};

type TodayTimelineProps = {
  events: TimelineEvent[];
  dateLabel: string;
  loading?: boolean;
};

export function TodayTimeline({
  events,
  dateLabel,
  loading,
}: TodayTimelineProps) {
  return (
    <SurfaceCard className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Today</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <Link
          href="/calendar"
          className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open calendar
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing on your timeline today.{" "}
          <Link href="/calendar" className="font-medium text-foreground underline-offset-4 hover:underline">
            Add to Calendar
          </Link>
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border/60">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    event.lifeCategory === "health"
                      ? "bg-income-muted text-income"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {CATEGORY_LABELS[event.lifeCategory]}
                </span>
                <span className="truncate text-sm font-medium">{event.title}</span>
              </div>
              {event.lifeCategory === "money" && event.amount != null && (
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {event.amount < 0 ? "-" : "+"}$
                  {Math.abs(event.amount).toFixed(0)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
