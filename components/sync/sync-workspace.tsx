"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { SyncCalendarGrid } from "@/components/calendar/sync-calendar-grid";
import { PulseOrganizer } from "@/components/pulse/pulse-organizer";
import { SyncLensPills } from "@/components/sync/sync-lens-pills";
import { SyncLifeStream } from "@/components/sync/sync-life-stream";
import { SyncWorkBlocks } from "@/components/sync/sync-work-blocks";
import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { useCapturedItems } from "@/lib/captured-items";
import {
  buildSyncTimeBlocksForRange,
  filterSyncTimeBlocksByArea,
  formatSyncClock,
  formatSyncTimeBlockRange,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import {
  LENS_HEADINGS,
  lensItemCount,
  lensNextLine,
  lensWorkScheduleLine,
} from "@/lib/sync-lens-copy";
import {
  generateHomeAmbientInsight,
} from "@/lib/time-block-insights";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

import type { SyncWorkspaceLens } from "@/lib/sync-lenses";

export type { SyncWorkspaceLens } from "@/lib/sync-lenses";

export type SyncWorkspaceProps = {
  activeLens: SyncWorkspaceLens;
  showInput?: boolean;
};

const AMBIENT_FALLBACK = "Nothing urgent right now.";
const HOME_EMPTY_STREAM =
  "Tell Sync something above to start organizing your life.";
const HOME_STREAM_LIMIT = 5;
const HOME_WEEK_LIMIT = 5;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function friendlyDayLabel(dateKey: string, reference: Date) {
  const today = toDateKey(reference);
  const tomorrow = toDateKey(addDays(reference, 1));
  if (dateKey === today) return "Today";
  if (dateKey === tomorrow) return "Tomorrow";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function blockSortKey(block: SyncTimeBlock) {
  return `${block.date}T${block.startTime ?? "00:00"}`;
}

function blockTimeLabel(block: SyncTimeBlock) {
  if (block.isTimed && block.startTime) {
    return formatSyncTimeBlockRange(block);
  }
  return "All day";
}

function itemWhenLabel(item: CapturedSyncItem) {
  const time =
    item.timeline?.startTime && item.timeline?.endTime
      ? `${formatSyncClock(item.timeline.startTime)} – ${formatSyncClock(item.timeline.endTime)}`
      : item.timeline?.startTime
        ? formatSyncClock(item.timeline.startTime)
        : item.timeLabel !== "Flexible"
          ? item.timeLabel
          : null;

  return [item.dateLabel, time]
    .filter((value) => value && value !== "Upcoming" && value !== "Flexible")
    .join(" · ");
}

function buildHorizonBlocks(
  items: CapturedSyncItem[],
  reference: Date,
  dayCount: number,
) {
  const end = addDays(reference, dayCount);
  return buildSyncTimeBlocksForRange({
    items,
    startDate: reference,
    endDate: end,
    reference,
    workSchedule: loadActiveWorkSchedule() ?? null,
  });
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
      {children}
    </h2>
  );
}

function CompactChips({
  destinations,
  protectedLabel,
  protectionRecommended,
}: {
  destinations: string[];
  protectedLabel?: boolean;
  protectionRecommended?: boolean;
}) {
  if (
    destinations.length === 0 &&
    !protectedLabel &&
    !protectionRecommended
  ) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {destinations.map((destination) => (
        <span
          key={destination}
          className="rounded-full bg-muted/35 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70"
        >
          {destination}
        </span>
      ))}
      {protectedLabel && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-primary/75">
          Protected
        </span>
      )}
      {protectionRecommended && !protectedLabel && (
        <span className="rounded-full bg-muted/45 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
          Protection recommended
        </span>
      )}
    </div>
  );
}

function CompactBlockRow({ block }: { block: SyncTimeBlock }) {
  return (
    <li className="rounded-2xl border border-border/15 bg-card/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="shrink-0 text-[13px] font-medium text-muted-foreground/68">
          {blockTimeLabel(block)}
        </p>
        <p className="min-w-0 flex-1 text-right text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
          {block.title}
        </p>
      </div>
      <CompactChips
        destinations={block.destinations}
        protectedLabel={block.protected}
      />
    </li>
  );
}

function CompactItemRow({
  item,
  showDay = false,
  reference,
}: {
  item: CapturedSyncItem;
  showDay?: boolean;
  reference: Date;
}) {
  const dateKey =
    item.timeline?.deadlineDate ?? item.timeline?.startDate ?? null;
  const day =
    showDay && dateKey ? friendlyDayLabel(dateKey, reference) : null;

  return (
    <li className="rounded-2xl border border-border/15 bg-card/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="shrink-0 text-[13px] font-medium text-muted-foreground/68">
          {day ? `${day} · ` : ""}
          {itemWhenLabel(item) || "Flexible"}
        </p>
        <p className="min-w-0 flex-1 text-right text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
          {item.title}
        </p>
      </div>
      {item.protectedTime?.reason && (
        <p className="mt-1.5 text-[12px] text-muted-foreground/62">
          {item.protectedTime.reason}
        </p>
      )}
      <CompactChips
        destinations={item.destinations}
        protectedLabel={item.protectedTime?.enabled}
        protectionRecommended={item.meaning?.protection.recommended}
      />
    </li>
  );
}

export function SyncWorkspace({
  activeLens,
  showInput = false,
}: SyncWorkspaceProps) {
  const { activeItems, softDeleteCapturedItem } = useCapturedItems();
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const reference = useMemo(() => new Date(), []);

  const isHome = activeLens === "home";
  const heading = isHome ? null : LENS_HEADINGS[activeLens];
  const visibleItems = mounted ? activeItems : [];
  const workSchedule = mounted ? loadActiveWorkSchedule() ?? null : null;

  const horizonBlocks = useMemo(() => {
    if (!mounted || !isHome) return [];
    return buildHorizonBlocks(activeItems, reference, 7);
  }, [mounted, isHome, activeItems, reference]);

  const ambientInsight = useMemo(() => {
    if (!mounted || !isHome) return AMBIENT_FALLBACK;
    return generateHomeAmbientInsight(horizonBlocks, activeItems, reference);
  }, [mounted, isHome, horizonBlocks, activeItems, reference]);

  const todayKey = mounted ? toDateKey(reference) : "";
  const weekEndKey = mounted ? toDateKey(addDays(reference, 7)) : "";

  const todayBlocks = useMemo(() => {
    if (!mounted || !isHome) return [];
    return [...horizonBlocks]
      .filter((block) => block.date === todayKey)
      .sort((a, b) => blockSortKey(a).localeCompare(blockSortKey(b)));
  }, [mounted, isHome, horizonBlocks, todayKey]);

  const weekBlocks = useMemo(() => {
    if (!mounted || !isHome) return [];
    const seen = new Set<string>();
    return [...horizonBlocks]
      .filter((block) => block.date > todayKey && block.date <= weekEndKey)
      .sort((a, b) => blockSortKey(a).localeCompare(blockSortKey(b)))
      .filter((block) => {
        const key = `${block.date}:${block.startTime ?? ""}:${block.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, HOME_WEEK_LIMIT);
  }, [mounted, isHome, horizonBlocks, todayKey, weekEndKey]);

  const protectedItems = useMemo(() => {
    if (!mounted || !isHome) return [];
    return activeItems
      .filter((item) => item.protectedTime?.enabled)
      .sort((a, b) => {
        const aKey =
          a.timeline?.deadlineDate ?? a.timeline?.startDate ?? a.createdAt;
        const bKey =
          b.timeline?.deadlineDate ?? b.timeline?.startDate ?? b.createdAt;
        return aKey.localeCompare(bKey);
      });
  }, [mounted, isHome, activeItems]);

  const itemCount = mounted ? lensItemCount(activeItems, activeLens) : 0;
  const hasStreamItems = itemCount > 0;

  const workBlocks = useMemo(() => {
    if (!mounted || activeLens !== "work") return [];
    const end = addDays(reference, 28);
    return filterSyncTimeBlocksByArea(
      buildSyncTimeBlocksForRange({
        items: activeItems,
        startDate: reference,
        endDate: end,
        workSchedule: workSchedule ?? null,
      }),
      "work",
    );
  }, [mounted, activeLens, activeItems, workSchedule, reference]);

  const nextInLens = mounted
    ? lensNextLine(activeItems, activeLens, workBlocks)
    : null;
  const workScheduleLine =
    mounted && activeLens === "work"
      ? lensWorkScheduleLine(workSchedule)
      : null;

  const handleDeleteItem = (item: (typeof activeItems)[number]) => {
    const confirmed = window.confirm(`Remove "${item.title}" from Sync?`);
    if (!confirmed) return;
    softDeleteCapturedItem(item.id);
    setNotice(`Removed "${item.title}".`);
  };

  const handleEditItem = (item: (typeof activeItems)[number]) => {
    setNotice(`To update this, use a command like: change ${item.title} to Friday.`);
  };

  const streamSection = (
    <div className={isHome ? "mt-10" : "mt-6"}>
      {!isHome && itemCount > 0 && (
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
          {itemCount} item{itemCount === 1 ? "" : "s"} in view
        </p>
      )}
      {isHome && hasStreamItems && (
        <SectionHeading>Life stream</SectionHeading>
      )}
      <SyncLifeStream
        items={visibleItems}
        activeLens={activeLens}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        limit={isHome ? HOME_STREAM_LIMIT : undefined}
        emptyMessage={
          isHome
            ? HOME_EMPTY_STREAM
            : "Nothing here yet. Capture something when it matters."
        }
      />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10" data-page="sync-workspace">
      {isHome ? (
        <section className="mx-auto w-full max-w-2xl space-y-10">
          <header className="text-center">
            <h1 className="text-[2.35rem] font-medium leading-none tracking-[-0.055em] text-foreground/95 sm:text-[3rem]">
              SYNC
            </h1>
            <p className="mt-3 text-[13px] font-medium tracking-[-0.01em] text-muted-foreground/62">
              Stay in Sync.
            </p>
          </header>

          {showInput && (
            <div>
              <PulseOrganizer variant="home" />
            </div>
          )}

          <p
            className="text-center text-[13px] leading-relaxed text-muted-foreground/58"
            suppressHydrationWarning
          >
            {mounted ? ambientInsight : AMBIENT_FALLBACK}
          </p>

          {mounted && notice && (
            <p className="text-center text-[13px] text-muted-foreground/68">
              {notice}
            </p>
          )}

          {mounted && todayBlocks.length > 0 && (
            <section>
              <SectionHeading>Today</SectionHeading>
              <ul className="space-y-2">
                {todayBlocks.map((block) => (
                  <CompactBlockRow key={block.id} block={block} />
                ))}
              </ul>
            </section>
          )}

          {mounted && weekBlocks.length > 0 && (
            <section>
              <SectionHeading>This Week</SectionHeading>
              <ul className="space-y-2">
                {weekBlocks.map((block) => (
                  <li
                    key={block.id}
                    className="rounded-2xl border border-border/15 bg-card/20 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="shrink-0 text-[13px] font-medium text-muted-foreground/68">
                        {friendlyDayLabel(block.date, reference)} ·{" "}
                        {blockTimeLabel(block)}
                      </p>
                      <p className="min-w-0 flex-1 text-right text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                        {block.title}
                      </p>
                    </div>
                    <CompactChips
                      destinations={block.destinations}
                      protectedLabel={block.protected}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mounted && protectedItems.length > 0 && (
            <section>
              <SectionHeading>Protected</SectionHeading>
              <ul className="space-y-2">
                {protectedItems.map((item) => (
                  <CompactItemRow key={item.id} item={item} reference={reference} />
                ))}
              </ul>
            </section>
          )}

          {mounted && streamSection}
        </section>
      ) : (
        <>
          {heading && (
            <header>
              <h1 className="text-[1.75rem] font-medium tracking-[-0.04em] text-foreground/95 sm:text-[2rem]">
                {heading.title}
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground/68">
                {heading.subtitle}
              </p>
              {nextInLens && (
                <p className="mt-2 text-[13px] font-medium text-muted-foreground/72">
                  {nextInLens}
                </p>
              )}
              {!nextInLens && itemCount === 0 && mounted && (
                <p className="mt-2 text-[13px] text-muted-foreground/58">
                  Nothing here yet. Capture something when it matters.
                </p>
              )}
            </header>
          )}

          <SyncLensPills activeLens={activeLens} className="mt-5" />

          {showInput && (
            <div className="mt-8">
              <PulseOrganizer />
            </div>
          )}

          {notice && (
            <p className="mt-4 text-[13px] text-muted-foreground/68">{notice}</p>
          )}

          {activeLens === "work" && mounted && (
            <div className="mt-6 space-y-3">
              {workScheduleLine && (
                <p className="text-[13px] text-muted-foreground/62">
                  {workScheduleLine}
                </p>
              )}
              <SyncWorkBlocks blocks={workBlocks} workSchedule={workSchedule} />
            </div>
          )}

          {activeLens === "calendar" && mounted && (
            <div className="mt-8">
              <SyncCalendarGrid items={activeItems} />
            </div>
          )}

          <div className={activeLens === "calendar" ? "mt-8" : undefined}>
            {streamSection}
          </div>
        </>
      )}
    </div>
  );
}
