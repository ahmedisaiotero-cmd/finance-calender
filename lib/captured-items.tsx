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
  | "Goals";

/** Life-area destinations only — never timeline or date labels. */
export const LIFE_AREA_DESTINATIONS: SyncDestination[] = [
  "Finance",
  "Calendar",
  "Health",
  "Work",
  "School",
  "Goals",
];

const CAPTURED_ITEMS_STORAGE_KEY = "sync.capturedItems";
const SYNC_DESTINATIONS: SyncDestination[] = [...LIFE_AREA_DESTINATIONS];

export type CapturedSyncItem = {
  id: string;
  title: string;
  category: PulsePlanCategory;
  prompt: string;
  destinations: SyncDestination[];
  dateLabel: string;
  timeLabel: string;
  amount?: string | null;
  frequency?: PulsePlanFrequency;
  moneyType?: PulseMoneyType;
  timeline?: TimelineResolution;
  createdAt: string;
};

type CapturedItemsContextValue = {
  items: CapturedSyncItem[];
  addCapturedItem: (
    plan: PulsePlan,
    destinations: SyncDestination[],
    title?: string,
  ) => CapturedSyncItem;
  removeCapturedItem: (id: string) => void;
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
      .map((item) => ({
        ...item,
        destinations: normalizeStoredDestinations(item.destinations),
      }));
  } catch {
    return [];
  }
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
      const captured: CapturedSyncItem = {
        id: plan.id,
        title: title ?? plan.title,
        category: plan.category,
        prompt: plan.prompt,
        destinations,
        dateLabel: plan.dateLabel,
        timeLabel: plan.timeLabel,
        amount: plan.parsedInput?.amount ?? null,
        frequency: plan.parsedInput?.frequency,
        moneyType: plan.parsedInput?.moneyType,
        timeline: plan.timeline,
        createdAt: plan.createdAt,
      };

      setItems((current) => [
        captured,
        ...current.filter((item) => item.id !== captured.id),
      ]);

      return captured;
    },
    [],
  );

  const removeCapturedItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const getItemsForDestination = useCallback(
    (destination: SyncDestination) =>
      items.filter((item) => item.destinations.includes(destination)),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addCapturedItem,
      removeCapturedItem,
      getItemsForDestination,
    }),
    [items, addCapturedItem, removeCapturedItem, getItemsForDestination],
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
