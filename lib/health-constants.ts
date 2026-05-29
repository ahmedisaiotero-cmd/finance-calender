import type { HealthEventSource } from "@/src/data/health-events";

export const healthSourceLabels: Record<HealthEventSource, string> = {
  recurring: "Weekly plan",
  logged: "Logged",
  scheduled: "Scheduled",
};

export const healthCategoryStyles: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  Cardio: {
    bg: "bg-sky-500/12",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Strength: {
    bg: "bg-violet-500/12",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  Yoga: {
    bg: "bg-teal-500/12",
    text: "text-teal-700 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  Nutrition: {
    bg: "bg-amber-500/12",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Wellness: {
    bg: "bg-emerald-500/12",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Rest: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function getHealthCategoryStyle(category: string) {
  return (
    healthCategoryStyles[category] ?? {
      bg: "bg-primary/10",
      text: "text-primary",
      dot: "bg-primary",
    }
  );
}

export function formatDuration(minutes?: number) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
