"use client";

import { useEffect, useMemo, useState } from "react";

import { SyncCalendarGrid } from "@/components/calendar/sync-calendar-grid";
import { PulseOrganizer } from "@/components/pulse/pulse-organizer";
import { SyncLifeStream, type SyncLens } from "@/components/sync/sync-life-stream";
import { SyncWorkBlocks } from "@/components/sync/sync-work-blocks";
import { useCapturedItems } from "@/lib/captured-items";
import {
  buildSyncTimeBlocksForRange,
  filterSyncTimeBlocksByArea,
} from "@/lib/sync-time-blocks";
import { generateAmbientInsightFromBlocks } from "@/lib/time-block-insights";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

import {
  LENS_HEADINGS,
  lensItemCount,
  lensSummaryLine,
} from "@/lib/sync-lens-copy";

export type SyncWorkspaceProps = {
  activeLens?: SyncLens;
  showInput?: boolean;
};

const AMBIENT_FALLBACK = "Nothing urgent right now.";
const HOME_EMPTY_STREAM =
  "Tell Sync something above to start organizing your life.";
const HOME_STREAM_LIMIT = 5;

function ambientInsight(
  items: ReturnType<typeof useCapturedItems>["activeItems"],
  reference = new Date(),
) {
  const end = new Date(reference);
  end.setDate(end.getDate() + 7);
  const blocks = buildSyncTimeBlocksForRange({
    items,
    startDate: reference,
    endDate: end,
    reference,
    workSchedule: loadActiveWorkSchedule() ?? null,
  });
  return generateAmbientInsightFromBlocks(blocks, reference);
}

export function SyncWorkspace({
  activeLens = "all",
  showInput = false,
}: SyncWorkspaceProps) {
  const { activeItems, softDeleteCapturedItem } = useCapturedItems();
  const [notice, setNotice] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHome = activeLens === "all" && showInput;
  const heading = isHome ? null : LENS_HEADINGS[activeLens];
  const visibleItems = mounted ? activeItems : [];
  const ambient = mounted ? ambientInsight(activeItems) : AMBIENT_FALLBACK;
  const nextInLens = mounted ? lensSummaryLine(activeItems, activeLens) : null;
  const itemCount = mounted ? lensItemCount(activeItems, activeLens) : 0;
  const hasStreamItems = mounted && lensItemCount(activeItems, activeLens) > 0;
  const workBlocks = useMemo(() => {
    if (!mounted || activeLens !== "work") return [];
    const end = new Date();
    end.setDate(end.getDate() + 28);
    return filterSyncTimeBlocksByArea(
      buildSyncTimeBlocksForRange({
        items: activeItems,
        startDate: new Date(),
        endDate: end,
        workSchedule: loadActiveWorkSchedule() ?? null,
      }),
      "work",
    );
  }, [mounted, activeLens, activeItems]);
  const workSchedule = mounted ? loadActiveWorkSchedule() ?? null : null;

  const handleDeleteItem = (item: (typeof activeItems)[number]) => {
    const confirmed = window.confirm(`Remove "${item.title}" from Sync?`);
    if (!confirmed) return;
    softDeleteCapturedItem(item.id);
    setNotice(`Removed "${item.title}".`);
  };

  const handleEditItem = (item: (typeof activeItems)[number]) => {
    setNotice(`To update this, use a command like: change ${item.title} to Friday.`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10" data-page="sync-workspace">
      {isHome ? (
        <section className="mx-auto w-full max-w-2xl">
          <header className="text-center">
            <h1 className="text-[2.35rem] font-medium leading-none tracking-[-0.055em] text-foreground/95 sm:text-[3rem]">
              SYNC
            </h1>
            <p className="mt-3 text-[13px] font-medium tracking-[-0.01em] text-muted-foreground/62">
              Stay in Sync.
            </p>
          </header>

          <div className="mt-8">
            <PulseOrganizer variant="home" />
          </div>

          <p className="mt-8 text-center text-[13px] text-muted-foreground/58">
            {ambient}
          </p>

          {notice && (
            <p className="mt-3 text-center text-[13px] text-muted-foreground/68">
              {notice}
            </p>
          )}

          <div className="mt-10">
            {hasStreamItems && (
              <p className="mb-4 text-center text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
                In your life stream
              </p>
            )}
            <SyncLifeStream
              items={visibleItems}
              activeLens={activeLens}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              limit={HOME_STREAM_LIMIT}
              emptyMessage={HOME_EMPTY_STREAM}
            />
          </div>
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
              {nextInLens && activeLens !== "work" && (
                <p className="mt-2 text-[13px] text-muted-foreground/58">
                  {nextInLens}
                </p>
              )}
              {!nextInLens && itemCount === 0 && mounted && activeLens !== "work" && (
                <p className="mt-2 text-[13px] text-muted-foreground/58">
                  Nothing here yet. Capture something when it matters.
                </p>
              )}
            </header>
          )}

          {showInput && (
            <div className="mt-8">
              <PulseOrganizer />
            </div>
          )}

          {notice && (
            <p className="mt-4 text-center text-[13px] text-muted-foreground/68">
              {notice}
            </p>
          )}

          {activeLens === "work" && mounted && (
            <div className="mt-6">
              <SyncWorkBlocks blocks={workBlocks} workSchedule={workSchedule} />
            </div>
          )}

          {activeLens === "calendar" && mounted && (
            <div className="mt-10">
              <SyncCalendarGrid items={activeItems} />
            </div>
          )}

          {activeLens !== "work" && (
          <div
            className={
              activeLens === "calendar"
                ? "mt-8"
                : showInput
                  ? "mt-10"
                  : "mt-6"
            }
          >
            {itemCount > 0 && (
              <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
                {itemCount} item{itemCount === 1 ? "" : "s"} in view
              </p>
            )}
            <SyncLifeStream
              items={visibleItems}
              activeLens={activeLens}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
            />
          </div>
          )}
        </>
      )}
    </div>
  );
}
