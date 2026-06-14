"use client";

import type { SyncWorkspaceLens } from "@/lib/sync-lenses";
import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";

export type SyncLifeStreamLens = SyncWorkspaceLens;
export type SyncLens = SyncLifeStreamLens;

type SyncLifeStreamProps = {
  items: CapturedSyncItem[];
  activeLens?: SyncLifeStreamLens;
  showLenses?: boolean;
  onLensChange?: (lens: SyncLifeStreamLens) => void;
  onEditItem?: (item: CapturedSyncItem) => void;
  onDeleteItem?: (item: CapturedSyncItem) => void;
  limit?: number;
  emptyMessage?: string;
};

const LENS_DESTINATION: Partial<Record<SyncLifeStreamLens, SyncDestination>> = {
  calendar: "Calendar",
  finance: "Finance",
  health: "Health",
  work: "Work",
  relationships: "Relationships",
  goals: "Goals",
  school: "School",
  family: "Family",
};

function itemDateKey(item: CapturedSyncItem) {
  return item.timeline?.deadlineDate ?? item.timeline?.startDate ?? item.createdAt;
}

function itemMeta(item: CapturedSyncItem) {
  const time =
    item.timeline?.startTime && item.timeline?.endTime
      ? `${formatClock(item.timeline.startTime)} – ${formatClock(item.timeline.endTime)}`
      : item.timeline?.startTime
        ? formatClock(item.timeline.startTime)
        : item.timeLabel;

  return [item.dateLabel, time]
    .filter((value) => value && value !== "Flexible" && value !== "Upcoming")
    .join(" · ");
}

function formatClock(value?: string) {
  if (!value) return "";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function filterByLens(items: CapturedSyncItem[], lens: SyncLifeStreamLens) {
  if (lens === "home") return items;
  const destination = LENS_DESTINATION[lens];
  if (!destination) return items;
  return items.filter((item) => item.destinations.includes(destination));
}

export function SyncLifeStream({
  items,
  activeLens = "home",
  showLenses = false,
  onEditItem,
  onDeleteItem,
  limit,
  emptyMessage = "Nothing here yet. Capture something when it matters.",
}: SyncLifeStreamProps) {
  const activeItems = items.filter(
    (item) => item.status !== "cancelled" && !item.deletedAt,
  );
  const streamItems = filterByLens(activeItems, activeLens)
    .sort((a, b) => itemDateKey(a).localeCompare(itemDateKey(b)))
    .slice(0, limit ?? activeItems.length);

  return (
    <section className="w-full space-y-3">
      {showLenses && (
        <div className="mb-3 flex flex-wrap gap-2">
          {/* Lens pills live in SyncWorkspace */}
        </div>
      )}

      {streamItems.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-muted-foreground/60">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {streamItems.map((item) => (
            <li
              key={item.id}
              className="w-full rounded-3xl border border-border/20 bg-card/30 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-medium tracking-[-0.02em] text-foreground/92">
                      {item.title}
                    </p>
                    {item.protectedTime?.enabled && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-primary/75">
                        Protected
                      </span>
                    )}
                    {item.meaning?.protection.recommended &&
                      !item.protectedTime?.enabled && (
                        <span className="rounded-full bg-muted/45 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
                          Protection recommended
                        </span>
                      )}
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted-foreground/68">
                    {itemMeta(item) || "Flexible"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.destinations.map((destination) => (
                      <span
                        key={destination}
                        className="rounded-full bg-muted/35 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/70"
                      >
                        {destination}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  {item.amount && (
                    <span className="text-[13px] font-medium text-muted-foreground/70">
                      {item.amount}
                    </span>
                  )}
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-full px-2 text-[18px] leading-6 text-muted-foreground/55 hover:bg-muted/35 hover:text-foreground/75">
                      ⋯
                    </summary>
                    <div className="absolute right-0 z-10 mt-1 min-w-28 rounded-xl border border-border/25 bg-popover p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => onEditItem?.(item)}
                        className="block w-full rounded-lg px-3 py-1.5 text-left text-[12px] text-muted-foreground/75 hover:bg-muted/35 hover:text-foreground/85"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem?.(item)}
                        className="block w-full rounded-lg px-3 py-1.5 text-left text-[12px] text-muted-foreground/75 hover:bg-muted/35 hover:text-foreground/85"
                      >
                        Delete
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
