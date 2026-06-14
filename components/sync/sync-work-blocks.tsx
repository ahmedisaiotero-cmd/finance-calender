"use client";

import type { SyncTimeBlock } from "@/lib/sync-time-blocks";
import {
  formatSyncTimeBlockCellLabel,
  formatSyncTimeBlockRange,
  formatWorkScheduleDaysLabel,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { summarizeWorkLensSchedule } from "@/lib/time-block-insights";

type SyncWorkBlocksProps = {
  blocks: SyncTimeBlock[];
  workSchedule?: PersistedWorkSchedule | null;
};

export function SyncWorkBlocks({ blocks, workSchedule }: SyncWorkBlocksProps) {
  const summary = summarizeWorkLensSchedule(blocks);
  const loggedBlocks = blocks.filter((block) => block.blockType !== "schedule");

  if (!summary && loggedBlocks.length === 0) {
    return (
      <p className="text-[14px] leading-relaxed text-muted-foreground/68">
        No work blocks yet. Tell Sync your schedule when you are ready.
      </p>
    );
  }

  if (summary && !summary.hasLoggedShifts && workSchedule) {
    return (
      <section className="rounded-2xl border border-border/20 bg-card/25 p-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
          Work Schedule
        </p>
        <p className="mt-2 text-[17px] font-medium tracking-[-0.03em] text-foreground/92">
          {formatWorkScheduleDaysLabel(workSchedule.days)}
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground/72">
          {summary.range}
        </p>
      </section>
    );
  }

  const visible = [...blocks]
    .filter((block) => block.blockType === "schedule" || block.area === "work")
    .slice(0, 12);

  return (
    <div className="space-y-4">
      {summary && workSchedule && (
        <section className="rounded-2xl border border-border/20 bg-card/25 p-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
            Work Schedule
          </p>
          <p className="mt-2 text-[15px] font-medium text-foreground/88">
            {formatWorkScheduleDaysLabel(workSchedule.days)}
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground/72">
            {summary.range}
          </p>
        </section>
      )}

      {visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((block) => (
            <li
              key={block.id}
              className="rounded-xl border border-border/20 bg-background/20 px-3 py-2.5"
            >
              <p className="text-[12px] font-medium text-muted-foreground/62">
                {block.date}
                {block.isTimed ? ` · ${formatSyncTimeBlockRange(block)}` : ""}
              </p>
              <p className="text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                {formatSyncTimeBlockCellLabel(block)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
