export type RecurringHealthEvent = {
  id: string;
  title: string;
  category: string;
  durationMinutes: number;
  /** 0 = Sunday … 6 = Saturday */
  daysOfWeek: number[];
};

export const recurringHealthEvents: RecurringHealthEvent[] = [
  {
    id: "morning-run",
    title: "Morning run",
    category: "Cardio",
    durationMinutes: 30,
    daysOfWeek: [1, 3, 5],
  },
  {
    id: "gym",
    title: "Strength training",
    category: "Strength",
    durationMinutes: 45,
    daysOfWeek: [2, 4],
  },
  {
    id: "yoga",
    title: "Yoga flow",
    category: "Yoga",
    durationMinutes: 40,
    daysOfWeek: [0],
  },
  {
    id: "meal-prep",
    title: "Meal prep",
    category: "Nutrition",
    durationMinutes: 60,
    daysOfWeek: [6],
  },
];
