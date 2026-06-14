"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {
  PulsePlan,
  PulsePlanCategory,
  PulsePlanFrequency,
  PulseMoneyType,
} from "@/lib/pulse/types";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

export type SyncDestination =
  | "Finance"
  | "Calendar"
  | "Health"
  | "Work"
  | "School"
  | "Goals"
  | "Relationships";

/** Life-area destinations only — never timeline or date labels. */
export const LIFE_AREA_DESTINATIONS: SyncDestination[] = [
  "Finance",
  "Calendar",
  "Health",
  "Work",
  "School",
  "Goals",
  "Relationships",
];

export type CaptureStatus = "active" | "completed" | "cancelled";

const CAPTURED_ITEMS_STORAGE_KEY = "sync.capturedItems";
const SYNC_DESTINATIONS: SyncDestination[] = [...LIFE_AREA_DESTINATIONS];

export type CapturedSyncItem = {
  id: string;
  title: string;
  category: PulsePlanCategory;
  prompt: string;
  originalPrompt?: string;
  normalizationCorrections?: string[];
  destinations: SyncDestination[];
  dateLabel: string;
  timeLabel: string;
  amount?: string | null;
  frequency?: PulsePlanFrequency;
  moneyType?: PulseMoneyType;
  timeline?: TimelineResolution;
  notes?: string;
  status: CaptureStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type CapturedItemsContextValue = {
  items: CapturedSyncItem[];
  activeItems: CapturedSyncItem[];
  addCapturedItem: (
    plan: PulsePlan,
    destinations: SyncDestination[],
    title?: string,
  ) => CapturedSyncItem;
  updateCapturedItem: (
    id: string,
    updates: Partial<CapturedSyncItem>,
  ) => CapturedSyncItem | null;
  removeCapturedItem: (id: string) => void;
  softDeleteCapturedItem: (id: string) => void;
  duplicateCapturedItem: (id: string) => CapturedSyncItem | null;
  getItemsForDestination: (destination: SyncDestination) => CapturedSyncItem[];
};

const CapturedItemsContext = createContext<CapturedItemsContextValue | null>(
  null,
);

function normalizeStoredDestinations(
  destinations: unknown,
): SyncDestination[] {
  if (!Array.isArray(destinations)) return [];

  const normalized: SyncDestination[] = [];

  for (const destination of destinations) {
    if (typeof destination !== "string") continue;
    if (destination === "Today") {
      normalized.push("Calendar");
      continue;
    }
    if (SYNC_DESTINATIONS.includes(destination as SyncDestination)) {
      normalized.push(destination as SyncDestination);
    }
  }

  return [...new Set(normalized)];
}

function normalizeStoredItem(item: CapturedSyncItem): CapturedSyncItem {
  const now = new Date().toISOString();
  return {
    ...item,
    destinations: normalizeStoredDestinations(item.destinations),
    status: item.status ?? "active",
    updatedAt: item.updatedAt ?? item.createdAt ?? now,
    deletedAt: item.deletedAt ?? null,
  };
}

function isCapturedSyncItem(value: unknown): value is CapturedSyncItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<CapturedSyncItem>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.category === "string" &&
    typeof item.prompt === "string" &&
    Array.isArray(item.destinations) &&
    normalizeStoredDestinations(item.destinations).length > 0 &&
    typeof item.dateLabel === "string" &&
    typeof item.timeLabel === "string" &&
    typeof item.createdAt === "string"
  );
}

function parseStoredCapturedItems(value: string | null): CapturedSyncItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isCapturedSyncItem)
      .map((item) => normalizeStoredItem({
        ...item,
        destinations: normalizeStoredDestinations(item.destinations),
        status: item.status ?? "active",
        updatedAt: item.updatedAt ?? item.createdAt,
      }));
  } catch {
    return [];
  }
}

function isActiveItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

export function CapturedItemsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CapturedSyncItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CAPTURED_ITEMS_STORAGE_KEY);
    queueMicrotask(() => {
      setItems(parseStoredCapturedItems(stored));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(
      CAPTURED_ITEMS_STORAGE_KEY,
      JSON.stringify(items),
    );
  }, [items, loaded]);

  const addCapturedItem = useCallback(
    (plan: PulsePlan, destinations: SyncDestination[], title?: string) => {
      const now = new Date().toISOString();
      const captured: CapturedSyncItem = {
        id: plan.id,
        title: title ?? plan.title,
        category: plan.category,
        prompt: plan.prompt,
        originalPrompt: plan.originalPrompt,
        normalizationCorrections: plan.normalizationCorrections,
        destinations,
        dateLabel: plan.dateLabel,
        timeLabel: plan.timeLabel,
        amount: plan.parsedInput?.amount ?? null,
        frequency: plan.parsedInput?.frequency,
        moneyType: plan.parsedInput?.moneyType,
        timeline: plan.timeline,
        status: "active",
        createdAt: plan.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
      };

      setItems((current) => [
        captured,
        ...current.filter((item) => item.id !== captured.id),
      ]);

      return captured;
    },
    [],
  );

  const updateCapturedItem = useCallback(
    (id: string, updates: Partial<CapturedSyncItem>) => {
      let updated: CapturedSyncItem | null = null;

      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          updated = normalizeStoredItem({
            ...item,
            ...updates,
            destinations: updates.destinations
              ? normalizeStoredDestinations(updates.destinations)
              : item.destinations,
            updatedAt: new Date().toISOString(),
          });
          return updated;
        }),
      );

      return updated;
    },
    [],
  );

  const removeCapturedItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const softDeleteCapturedItem = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "cancelled",
              deletedAt: now,
              updatedAt: now,
            }
          : item,
      ),
    );
  }, []);

  const duplicateCapturedItem = useCallback((id: string) => {
    let duplicate: CapturedSyncItem | null = null;
    const now = new Date().toISOString();

    setItems((current) => {
      const source = current.find((item) => item.id === id);
      if (!source) return current;

      duplicate = {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} (copy)`,
        status: "active",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      return [duplicate, ...current];
    });

    return duplicate;
  }, []);

  const activeItems = useMemo(
    () => items.filter(isActiveItem),
    [items],
  );

  const getItemsForDestination = useCallback(
    (destination: SyncDestination) =>
      activeItems.filter((item) => item.destinations.includes(destination)),
    [activeItems],
  );

  const value = useMemo(
    () => ({
      items,
      activeItems,
      addCapturedItem,
      updateCapturedItem,
      removeCapturedItem,
      softDeleteCapturedItem,
      duplicateCapturedItem,
      getItemsForDestination,
    }),
    [
      items,
      activeItems,
      addCapturedItem,
      updateCapturedItem,
      removeCapturedItem,
      softDeleteCapturedItem,
      duplicateCapturedItem,
      getItemsForDestination,
    ],
  );

  return (
    <CapturedItemsContext.Provider value={value}>
      {children}
    </CapturedItemsContext.Provider>
  );
}

export function useCapturedItems() {
  const context = useContext(CapturedItemsContext);
  if (!context) {
    throw new Error("useCapturedItems must be used within CapturedItemsProvider");
  }
  return context;
}
