export type HealthActivity = {
  id: string;
  title: string;
  category: string;
  durationMinutes: number;
  date: string;
  dateISO?: string;
};

export const healthActivities: HealthActivity[] = [
  {
    id: "a1",
    title: "Evening walk",
    category: "Cardio",
    durationMinutes: 25,
    date: "Today",
  },
  {
    id: "a2",
    title: "Core workout",
    category: "Strength",
    durationMinutes: 20,
    date: "Yesterday",
  },
  {
    id: "a3",
    title: "Stretch & mobility",
    category: "Yoga",
    durationMinutes: 15,
    date: "May 26",
  },
];
