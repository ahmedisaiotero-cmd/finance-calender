import type { CapturedSyncItem } from "@/lib/captured-items";
import { describeItemTiming } from "@/lib/mobile-prototype/build-daily-brief";

export type MemoryEntryView = {
  id: string;
  title: string;
  timing: string | null;
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
  return items
    .filter((item) => item.status !== "cancelled" && !item.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((item) => ({
      id: item.id,
      title: item.title,
      timing: describeItemTiming(item, reference),
      whenLabel: item.timeline?.label ?? item.dateLabel,
      prompt: item.originalPrompt ?? item.prompt,
      destinations: item.destinations,
      rememberedAt: formatRememberedAt(item.updatedAt),
    }));
}
