import type { CapturedSyncItem } from "@/lib/captured-items";

export const CAPTURED_ITEMS_STORAGE_KEY = "sync.capturedItems";

/** Round-trip serialization used by CapturedItemsProvider and trust regression tests. */
export function serializeCapturedItemsForStorage(
  items: CapturedSyncItem[],
): string {
  return JSON.stringify(items);
}

export function parseCapturedItemsFromStorage(
  value: string | null,
): CapturedSyncItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CapturedSyncItem[];
  } catch {
    return [];
  }
}

export function assertCapturePersistenceFields(item: CapturedSyncItem) {
  if (!item.id) throw new Error("missing id");
  if (!item.timeline && item.category !== "expense") {
    // timeline optional for some categories but should survive when present
  }
  if (!Array.isArray(item.destinations)) throw new Error("missing destinations");
  if (!item.status) throw new Error("missing status");
  if (!item.createdAt) throw new Error("missing createdAt");
  if (!item.updatedAt) throw new Error("missing updatedAt");
}
