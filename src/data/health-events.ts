export type HealthEventSource = "recurring" | "logged" | "scheduled";

export type HealthEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  source: HealthEventSource;
  durationMinutes?: number;
};

export const scheduledHealthEvents: HealthEvent[] = [
  {
    id: "h-sched-1",
    title: "5K race",
    category: "Cardio",
    date: "2026-05-18",
    source: "scheduled",
    durationMinutes: 35,
  },
  {
    id: "h-sched-2",
    title: "Annual physical",
    category: "Wellness",
    date: "2026-05-22",
    source: "scheduled",
    durationMinutes: 60,
  },
];
