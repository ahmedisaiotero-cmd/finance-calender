import { captureLifeCategory } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { isMoneyLanguage } from "@/lib/sync-capture/surface-copy";

export type MemoryFilterCategory =
  | "All"
  | "Family"
  | "Relationships"
  | "Money"
  | "Health"
  | "Work"
  | "Personal";

export const MEMORY_FILTER_CATEGORIES: Exclude<MemoryFilterCategory, "All">[] = [
  "Family",
  "Relationships",
  "Money",
  "Health",
  "Work",
  "Personal",
];

const LIFE_CATEGORY_TO_FILTER: Record<
  ReturnType<typeof captureLifeCategory>,
  Exclude<MemoryFilterCategory, "All">
> = {
  relationships: "Relationships",
  health: "Health",
  money: "Money",
  work: "Work",
  goals: "Personal",
  personal: "Personal",
  family: "Family",
  reflection: "Personal",
  career: "Work",
};

export function memoryFilterCategory(
  item: CapturedSyncItem,
): Exclude<MemoryFilterCategory, "All"> {
  if (item.destinations.includes("Family")) return "Family";

  const lifeCategory = captureLifeCategory(item);
  const mapped = LIFE_CATEGORY_TO_FILTER[lifeCategory];
  if (mapped && mapped !== "Personal") return mapped;

  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  if (
    item.destinations.includes("Finance") ||
    item.moneyType === "income" ||
    item.category === "expense" ||
    item.category === "subscription" ||
    isMoneyLanguage(text) ||
    /\b(payday|rent|bill|subscription)\b/.test(text)
  ) {
    return "Money";
  }

  return mapped ?? "Personal";
}

export function memoryDisplayCategory(item: CapturedSyncItem): string {
  return memoryFilterCategory(item);
}

export function availableMemoryFilters(
  items: CapturedSyncItem[],
): MemoryFilterCategory[] {
  const present = new Set<Exclude<MemoryFilterCategory, "All">>();
  for (const item of items) {
    if (item.status === "cancelled" || item.deletedAt) continue;
    present.add(memoryFilterCategory(item));
  }

  return [
    "All",
    ...MEMORY_FILTER_CATEGORIES.filter((category) => present.has(category)),
  ];
}
