import type { CapturedSyncItem } from "@/lib/captured-items";

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

export function memoryFilterCategory(
  item: CapturedSyncItem,
): Exclude<MemoryFilterCategory, "All"> {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();

  if (item.destinations.includes("Family")) return "Family";
  if (item.destinations.includes("Relationships")) return "Relationships";
  if (
    item.destinations.includes("Finance") ||
    item.parsedInput?.moneyType === "income" ||
    item.moneyType === "income" ||
    /\b(payday|rent|bill|subscription)\b/.test(text)
  ) {
    return "Money";
  }
  if (
    item.destinations.includes("Health") ||
    item.category === "workout" ||
    /\b(gym|workout|shower|sleep|medication|doctor)\b/.test(text)
  ) {
    return "Health";
  }
  if (
    item.destinations.includes("Work") ||
    item.category === "workday" ||
    item.category === "work-schedule"
  ) {
    return "Work";
  }

  return "Personal";
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
