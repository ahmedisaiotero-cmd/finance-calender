export type CalendarEventSource = "recurring" | "transaction" | "scheduled";

export type CalendarEvent = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  source: CalendarEventSource;
};

/** One-time scheduled events (not recurring, not from transaction log). */
export const oneTimeEvents: CalendarEvent[] = [
  {
    id: "scheduled-insurance",
    title: "Car insurance",
    category: "Transport",
    amount: -142,
    date: "2026-05-10",
    source: "scheduled",
  },
];
