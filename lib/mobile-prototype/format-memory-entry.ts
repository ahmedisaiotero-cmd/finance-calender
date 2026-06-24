import type { CapturedSyncItem } from "@/lib/captured-items";
import { isVisibleInMemoryList, memoryListSortScore } from "@/lib/intelligence/memory-aging";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import { dedupeMemoryItems } from "@/lib/sync-capture/memory-dedup";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";

export type MemoryEntryView = {
  id: string;
  title: string;
  subtitle: string;
  whenLabel: string;
  prompt: string;
  destinations: string[];
  rememberedAt: string;
};

function formatRememberedAt(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function buildMemoryEntries(
  items: CapturedSyncItem[],
  reference = new Date(),
): MemoryEntryView[] {
  const active = dedupeMemoryItems(items, reference).filter((item) =>
    isVisibleInMemoryList(item, items, reference),
  );

  return active
    .sort(
      (a, b) =>
        memoryListSortScore(b, items, reference) -
        memoryListSortScore(a, items, reference),
    )
    .map((item) => ({
      id: item.id,
      title: displayMemoryTitle(item),
      subtitle: resolveMemoryUnderstanding(item, reference),
      whenLabel: item.timeline?.label ?? item.dateLabel,
      prompt: item.originalPrompt ?? item.prompt,
      destinations: item.destinations,
      rememberedAt: formatRememberedAt(item.updatedAt),
    }));
}
