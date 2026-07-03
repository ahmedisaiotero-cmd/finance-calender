import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  SYNC_LAB_MEMORY_VISIBILITY_DEFAULT,
  SYNC_LAB_MEMORY_VISIBILITY_STORAGE_KEY,
  SYNC_LAB_TEST_MEMORY_STORAGE_KEY,
  type SyncLabMemoryVisibility,
  type SyncLabMemoryVisibilityMap,
} from "@/lib/sync-engine/tools/lab-state";

export function readLabMemories() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(SYNC_LAB_TEST_MEMORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CapturedSyncItem[]) : [];
  } catch {
    return [];
  }
}

export function writeLabMemories(memories: CapturedSyncItem[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    SYNC_LAB_TEST_MEMORY_STORAGE_KEY,
    JSON.stringify(memories),
  );
}

export function readLabMemoryVisibility() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(
      SYNC_LAB_MEMORY_VISIBILITY_STORAGE_KEY,
    );
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as SyncLabMemoryVisibilityMap)
      : {};
  } catch {
    return {};
  }
}

export function writeLabMemoryVisibility(
  visibility: SyncLabMemoryVisibilityMap,
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    SYNC_LAB_MEMORY_VISIBILITY_STORAGE_KEY,
    JSON.stringify(visibility),
  );
}

export function resolveLabMemoryVisibility(
  id: string,
  visibility: SyncLabMemoryVisibilityMap,
): SyncLabMemoryVisibility {
  return visibility[id] ?? SYNC_LAB_MEMORY_VISIBILITY_DEFAULT;
}
